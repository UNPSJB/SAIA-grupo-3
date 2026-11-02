from datetime import date, timedelta
from uuid import uuid4

import pytest
from sqlalchemy import select, func

from tests.database import db_session  # noqa: F401
from tests.abastecimiento.test_seed import ejecutar_seed, conteos, saldos  # noqa: F401
from scripts.seed_stock_minimo import CASOS, NOMBRE_PLAN, NOMBRE_PRODUCTO, NOMBRE_TAREA, nombre_caso
from src.insumos.models import Insumo
from src.insumosQuimicos.models import InsumoQuimico
from src.insumosQuimicos.schemas import InsumoQuimicoUpdate
from src.insumosQuimicos.services import modificar_insumo_quimico
from src.notificaciones.models import Notificacion, TipoNotificacion
from src.notificaciones.services import listar_notificaciones
from src.checklist.models import ItemChecklist, EstadoItem
from src.checklist.schemas import InsumoQuimicoConsumido
from src.checklist.services import finalizar_item_checklist
from src.plan.models import Plan
from src.producto.models import Producto
from src.loteProduccion.schemas import LoteProduccionCreate, LoteInsumoCreate
from src.loteProduccion.services import crear_lote
from src.abastecimiento.models import LoteRecepcionInsumo
from src.abastecimiento.schemas import LoteInput
from src.abastecimiento.services import guardar_recepcion
from src.personal.models import Personal


def caso(db, codigo, modelo=Insumo):
    return db.scalar(select(modelo).where(modelo.nombre == nombre_caso(codigo)))


def aviso(db, insumo):
    tipo = 'quimico' if isinstance(insumo, InsumoQuimico) else 'insumo'
    return db.scalar(select(Notificacion).where(Notificacion.clave == f'stock-bajo-{tipo}-{insumo.id}'))


def estados_avisos(db):
    return {n.id: (n.leida, n.resuelta, n.fecha_creacion, n.mensaje) for n in db.scalars(select(Notificacion))}


def test_seed_incluye_escenarios_visibles_y_alertas(db_session, ejecutar_seed):
    ejecutar_seed()
    for modelo in (Insumo, InsumoQuimico):
        for codigo, _, cantidad, minimo in CASOS:
            insumo = caso(db_session, codigo, modelo)
            assert insumo is not None and insumo.stock_minimo == minimo
            assert insumo.cantidad == pytest.approx(12 if codigo == 'repuesto' else cantidad)
            notificacion = aviso(db_session, insumo)
            if codigo in ('igual', 'bajo', 'cero'):
                assert insumo.stock_bajo and notificacion and not notificacion.leida and not notificacion.resuelta
            elif codigo == 'repuesto':
                assert not insumo.stock_bajo and notificacion.resuelta and notificacion.leida
            else:
                assert not insumo.stock_bajo and notificacion is None
    assert db_session.scalar(select(func.count()).select_from(Notificacion).where(
        Notificacion.tipo == TipoNotificacion.TEMPERATURA_FUERA_RANGO)) == 32
    recientes = {n.id for n in listar_notificaciones(db_session, limite=20)}
    for modelo in (Insumo, InsumoQuimico):
        for codigo in ('igual', 'bajo', 'cero', 'repuesto'):
            assert aviso(db_session, caso(db_session, codigo, modelo)).id in recientes


def test_consumir_ejemplos_dispara_avisos_y_repetir_no_reinicia(db_session, ejecutar_seed):
    ejecutar_seed()
    insumo = caso(db_session, 'preparado')
    quimico = caso(db_session, 'preparado', InsumoQuimico)
    producto = db_session.scalar(select(Producto).where(Producto.nombre == NOMBRE_PRODUCTO))
    plan = db_session.scalar(select(Plan).where(Plan.nombre == NOMBRE_PLAN))
    item = db_session.scalar(select(ItemChecklist).where(ItemChecklist.plan_id == plan.id,
        ItemChecklist.periodo_inicio == date.today()))
    assert item.estado == EstadoItem.PENDIENTE
    recepcion = db_session.scalar(select(LoteRecepcionInsumo).where(
        LoteRecepcionInsumo.insumo_id == insumo.id))
    crear_lote(db_session, LoteProduccionCreate(producto_id=producto.id, fecha_produccion=date.today(), cantidad=1,
        insumos=[LoteInsumoCreate(insumo_id=insumo.id, cantidad_usada=1,
            lotes_recepcion=[dict(lote_recepcion_id=recepcion.id, cantidad=1)])]), plan.responsable_id)
    finalizar_item_checklist(db_session, item.id, plan.responsable_id, consumos=[
        InsumoQuimicoConsumido(insumo_quimico_id=quimico.id, cantidad_utilizada=1)])
    for i in (insumo, quimico):
        assert i.cantidad == 5 and aviso(db_session, i) is not None
    assert item.estado == EstadoItem.REALIZADA
    antes = conteos(db_session), saldos(db_session), estados_avisos(db_session)
    ejecutar_seed()
    assert (conteos(db_session), saldos(db_session), estados_avisos(db_session)) == antes
    assert item.estado == EstadoItem.REALIZADA and quimico.cantidad == 5


def test_repetir_respeta_reposiciones_minimos_y_lectura(db_session, ejecutar_seed):
    ejecutar_seed()
    insumo = caso(db_session, 'igual')
    recepcion = db_session.scalar(select(LoteRecepcionInsumo).where(LoteRecepcionInsumo.insumo_id == insumo.id))
    admin = db_session.scalar(select(Personal).where(Personal.username == 'admin'))
    guardar_recepcion(db_session, LoteInput(insumo_id=insumo.id, proveedor_id=recepcion.proveedor_id,
        numero_lote='PRUEBA-REPOSICION', cantidad=10, fecha_recepcion=date.today(),
        fecha_vencimiento=date.today()+timedelta(days=90), clave_operacion=uuid4()), admin.id)
    assert insumo.cantidad == 15 and aviso(db_session, insumo).resuelta
    quimico = caso(db_session, 'bajo', InsumoQuimico)
    modificar_insumo_quimico(db_session, quimico.id, InsumoQuimicoUpdate(cantidad=13, stock_minimo=None))
    bajo = caso(db_session, 'bajo')
    aviso(db_session, bajo).leida = True
    db_session.commit()
    antes = conteos(db_session), saldos(db_session), estados_avisos(db_session)
    ejecutar_seed()
    assert (conteos(db_session), saldos(db_session), estados_avisos(db_session)) == antes
    assert quimico.cantidad == 13 and quimico.stock_minimo is None
    assert aviso(db_session, bajo).leida


def test_agregar_casos_a_seed_anterior_respeta_proveedor_dado_de_baja(db_session, ejecutar_seed, monkeypatch):
    from scripts import seed_all
    from src.abastecimiento.models import Proveedor
    with monkeypatch.context() as parche:
        parche.setattr(seed_all, 'cargar_stock_minimo', lambda *args, **kwargs: None)
        ejecutar_seed()
    proveedor = db_session.scalar(select(Proveedor).order_by(Proveedor.id))
    proveedor.activo = False
    db_session.commit()
    ejecutar_seed()
    insumo = caso(db_session, 'preparado')
    recepcion = db_session.scalar(select(LoteRecepcionInsumo).where(LoteRecepcionInsumo.insumo_id == insumo.id))
    assert recepcion.proveedor_id != proveedor.id
    assert not proveedor.activo and recepcion.proveedor.activo
    assert insumo.cantidad == 6
