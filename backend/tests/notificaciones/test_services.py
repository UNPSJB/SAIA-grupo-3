"""toda la persistencia se hace en SQLite aislado."""
from datetime import date, datetime, timedelta
import sqlite3
from pathlib import Path
import pytest
from pydantic import ValidationError
from sqlalchemy import select, func
from tests.database import db_session, unidad_medida, insumo_activo, producto, persona_operadora
from src.insumos.models import Insumo
from src.insumos.schemas import InsumoCreate, InsumoUpdate
from src.insumos import services as ingredientes
from src.insumosQuimicos.models import InsumoQuimico, TipoQuimico
from src.insumosQuimicos.schemas import InsumoQuimicoCreate, InsumoQuimicoUpdate
from src.insumosQuimicos import services as quimicos
from src.notificaciones.models import Notificacion
from src.notificaciones import services as avisos
from src.consumoQuimico import services as consumos
from src.consumoQuimico.schemas import ConsumoQuimicoCreate, ConsumoQuimicoUpdate
from src.consumoQuimico.models import ConsumoQuimico
from src.documentacion.models import Documentacion
from src.documentacion.vencimientos import DIAS_AVISO_VENCIMIENTO
from src.notificaciones.constants import ENLACE_VENCIMIENTOS
from src.notificaciones.models import TipoNotificacion
from src.tipoDocumento.models import TipoDocumento

def crear_quimico(db, unidad, nombre='Detergente', cantidad=10, minimo=5):
    return quimicos.crear_insumo_quimico(db, InsumoQuimicoCreate(nombre=nombre, cantidad=cantidad, stock_minimo=minimo, tipo_quimico=TipoQuimico.DETERGENTE, unidad_medida_id=unidad.id))

def recibir_prueba(db, insumo, actor, cantidad):
    if not cantidad:
        return
    from datetime import timedelta
    from uuid import uuid4
    from src.abastecimiento.models import Proveedor, LoteRecepcionInsumo
    proveedor = Proveedor(nombre='Proveedor ficticio', cuit=str(uuid4()), activo=True)
    db.add(proveedor)
    db.flush()
    db.add(LoteRecepcionInsumo(insumo_id=insumo.id, proveedor_id=proveedor.id, numero_lote='TEST', cantidad=cantidad, cantidad_disponible=cantidad, fecha_recepcion=date.today(), fecha_vencimiento=date.today() + timedelta(days=30), registrado_por_id=actor.id, clave_operacion=str(uuid4()), activo=True, conciliacion=False))
    db.commit()
    db.refresh(insumo)

def usar(db, q, cantidad=5):
    return consumos.crear_consumo(db, ConsumoQuimicoCreate(insumo_quimico_id=q.id, cantidad_utilizada=cantidad, fecha=date.today(), tarea_limpieza='Limpieza demo'))

def cantidad_avisos(db):
    return db.scalar(select(func.count()).select_from(Notificacion))

@pytest.mark.parametrize('modelo', [InsumoCreate, InsumoQuimicoCreate])
@pytest.mark.parametrize('invalido', [-1, float('nan'), float('inf'), float('-inf')])
def test_minimo_invalido(modelo, invalido):
    with pytest.raises(ValidationError):
        datos = dict(nombre='Prueba', stock_minimo=invalido, unidad_medida_id=1)
        if modelo is InsumoQuimicoCreate:
            datos.update(cantidad=0, tipo_quimico='detergente')
        modelo(**datos)

@pytest.mark.parametrize('quimico', [False, True])
def test_sin_minimo_cero_y_quitar_minimo(db_session, unidad_medida, quimico):
    if quimico:
        i = crear_quimico(db_session, unidad_medida, cantidad=0, minimo=None)
        update = quimicos.modificar_insumo_quimico
        schema = InsumoQuimicoUpdate
    else:
        i = ingredientes.crear_insumo(db_session, InsumoCreate(nombre='Harina', unidad_medida_id=unidad_medida.id))
        update = ingredientes.modificar_insumo
        schema = InsumoUpdate
    assert cantidad_avisos(db_session) == 0
    update(db_session, i.id, schema(stock_minimo=0))
    aviso = db_session.scalar(select(Notificacion))
    assert aviso and (not aviso.resuelta)
    update(db_session, i.id, schema(stock_minimo=None))
    assert i.stock_minimo is None and aviso.resuelta

def test_filtro_contador_activos_y_scheduler(db_session, unidad_medida, persona_operadora):
    for n in range(3):
        i = ingredientes.crear_insumo(db_session, InsumoCreate(nombre=f'Harina {n}', unidad_medida_id=unidad_medida.id))
        recibir_prueba(db_session, i, persona_operadora, n)
        ingredientes.modificar_insumo(db_session, i.id, InsumoUpdate(stock_minimo=1))
    q = crear_quimico(db_session, unidad_medida, cantidad=1, minimo=1)
    filtro = ingredientes.listar_insumos(db_session, size=1, solo_stock_bajo=True)
    assert filtro['total'] == 2 and filtro['pages'] == 2 and (len(filtro['items']) == 1)
    assert ingredientes.listar_insumos(db_session, buscar='Harina 2', solo_stock_bajo=True)['total'] == 0
    assert quimicos.listar_insumos_quimicos(db_session, solo_stock_bajo=True)['total'] == 1
    assert avisos.contar_stock_bajo(db_session) == {'insumos': 2, 'insumos_quimicos': 1, 'total': 3}
    q.activo = False
    db_session.commit()
    avisos.revisar_stock_todos(db_session)
    assert db_session.scalar(select(Notificacion).where(Notificacion.clave == f'stock-bajo-quimico-{q.id}')).resuelta
    assert avisos.contar_stock_bajo(db_session)['total'] == 2
    assert quimicos.listar_insumos_quimicos(db_session, mostrar_inactivos=True, solo_stock_bajo=True)['total'] == 0

def test_revisar_sin_confirmar_no_confirma_movimiento(db_session, unidad_medida):
    q = crear_quimico(db_session, unidad_medida)
    q.cantidad = 5
    avisos.revisar_stock_insumo(db_session, q, confirmar=False)
    db_session.rollback()
    assert q.cantidad == 10 and cantidad_avisos(db_session) == 0

def test_dos_revisiones_simultaneas_no_duplican(tmp_path):
    from concurrent.futures import ThreadPoolExecutor
    from threading import Barrier
    from sqlalchemy import create_engine
    from sqlalchemy.orm import Session
    from src.models import ModeloBase
    from src.unidadMedida.models import UnidadMedida, TipoUnidadMedida
    motor = create_engine(f"sqlite:///{tmp_path / 'concurrencia.db'}", connect_args={'timeout': 10})
    ModeloBase.metadata.create_all(motor)
    with Session(motor) as db:
        u = UnidadMedida(tipo=TipoUnidadMedida.PESO, sufijo='kg', activo=True)
        db.add(u)
        db.flush()
        i = Insumo(nombre='Prueba', stock_minimo=0, unidad_medida_id=u.id, activo=True)
        db.add(i)
        db.commit()
        identificador = i.id
    barrier = Barrier(2)

    def revisar_en_sesion():
        with Session(motor) as db:
            i = db.get(Insumo, identificador)
            barrier.wait(timeout=5)
            avisos.revisar_stock_insumo(db, i)
    try:
        with ThreadPoolExecutor(max_workers=2) as pool:
            futuros = [pool.submit(revisar_en_sesion) for _ in range(2)]
            for futuro in futuros:
                futuro.result(timeout=15)
        with Session(motor) as db:
            assert cantidad_avisos(db) == 1
    finally:
        motor.dispose()

def test_cantidad_calculada_coincide_en_filtro_y_aviso(db_session, unidad_medida, persona_operadora):
    from datetime import timedelta
    from src.abastecimiento.models import LoteRecepcionInsumo
    insumo = ingredientes.crear_insumo(db_session, InsumoCreate(nombre='Harina calculada', unidad_medida_id=unidad_medida.id))
    recibir_prueba(db_session, insumo, persona_operadora, 2)
    recibir_prueba(db_session, insumo, persona_operadora, 3)
    recibir_prueba(db_session, insumo, persona_operadora, 100)
    lotes = db_session.scalars(select(LoteRecepcionInsumo).where(LoteRecepcionInsumo.insumo_id == insumo.id).order_by(LoteRecepcionInsumo.id)).all()
    lotes[-1].activo = False
    lotes[0].fecha_vencimiento = date.today() - timedelta(days=1)
    db_session.commit()
    ingredientes.modificar_insumo(db_session, insumo.id, InsumoUpdate(stock_minimo=5))
    assert insumo.cantidad == 5
    assert db_session.scalar(select(Insumo.cantidad).where(Insumo.id == insumo.id)) == 5
    assert ingredientes.listar_insumos(db_session, solo_stock_bajo=True)['total'] == 1
    assert avisos.contar_stock_bajo(db_session)['insumos'] == 1
    assert cantidad_avisos(db_session) == 1

def _crear_documento(db, personal_id, nombre_tipo, fecha_vencimiento):
    tipo = db.scalar(select(TipoDocumento).where(TipoDocumento.nombre == nombre_tipo))
    if tipo is None:
        tipo = TipoDocumento(nombre=nombre_tipo, activo=True)
        db.add(tipo)
        db.flush()
    doc = Documentacion(
        personal_id=personal_id,
        tipo_documento_id=tipo.id,
        fecha_vencimiento=fecha_vencimiento,
    )
    db.add(doc)
    db.commit()
    return doc


def test_con_documentos_vencidos_o_por_vencer_genera_aviso_con_mensaje_correcto(
    db_session, persona_operadora, persona_administradora
):
    hoy = date(2026, 6, 1)
    _crear_documento(db_session, persona_operadora.id, "Carnet", hoy - timedelta(days=2))

    aviso = avisos.generar_aviso_vencimientos(db_session, hoy=hoy)

    assert aviso is not None
    assert aviso.tipo == TipoNotificacion.VENCIMIENTO_DOCUMENTACION
    assert aviso.titulo == "Documentación para renovar"
    assert aviso.mensaje == "1 empleado tiene 1 documento vencido."
    assert aviso.enlace == ENLACE_VENCIMIENTOS
    assert aviso.leida is False

    _crear_documento(db_session, persona_administradora.id, "Libreta", hoy + timedelta(days=3))
    aviso_actualizado = avisos.generar_aviso_vencimientos(db_session, hoy=hoy)

    assert aviso_actualizado.mensaje == (
        "2 empleados tienen 1 documento vencido y 1 documento por vencer "
        f"en los próximos {DIAS_AVISO_VENCIMIENTO} días."
    )


def test_sin_vencimientos_no_se_genera_aviso(db_session, persona_operadora):
    hoy = date(2026, 6, 1)
    assert avisos.generar_aviso_vencimientos(db_session, hoy=hoy) is None
    assert cantidad_avisos(db_session) == 0

    # Con un documento vigente (fuera de la ventana de aviso) tampoco genera
    _crear_documento(
        db_session,
        persona_operadora.id,
        "Carnet",
        hoy + timedelta(days=DIAS_AVISO_VENCIMIENTO + 15),
    )
    assert avisos.generar_aviso_vencimientos(db_session, hoy=hoy) is None
    assert cantidad_avisos(db_session) == 0


def test_generar_dos_veces_el_mismo_dia_no_duplica(db_session, persona_operadora):
    hoy = date(2026, 6, 1)
    _crear_documento(db_session, persona_operadora.id, "Carnet", hoy - timedelta(days=1))

    primero = avisos.generar_aviso_vencimientos(db_session, hoy=hoy)
    segundo = avisos.generar_aviso_vencimientos(db_session, hoy=hoy)

    assert primero.id == segundo.id
    assert cantidad_avisos(db_session) == 1


def test_avisos_de_dias_anteriores_quedan_marcados_como_leidos(
    db_session, persona_operadora
):
    ayer = date(2026, 5, 31)
    hoy = date(2026, 6, 1)
    _crear_documento(db_session, persona_operadora.id, "Carnet", ayer - timedelta(days=1))

    aviso_ayer = avisos.generar_aviso_vencimientos(db_session, hoy=ayer)
    assert aviso_ayer.leida is False

    aviso_hoy = avisos.generar_aviso_vencimientos(db_session, hoy=hoy)
    db_session.refresh(aviso_ayer)

    assert aviso_ayer.leida is True
    assert aviso_hoy.id != aviso_ayer.id
    assert aviso_hoy.leida is False


def test_si_cambia_el_mensaje_el_aviso_vuelve_a_quedar_sin_leer(
    db_session, persona_operadora
):
    hoy = date(2026, 6, 1)
    _crear_documento(db_session, persona_operadora.id, "Carnet", hoy - timedelta(days=1))

    aviso = avisos.generar_aviso_vencimientos(db_session, hoy=hoy)
    avisos.marcar_leida(db_session, aviso.id)
    assert aviso.leida is True

    # Si no cambió el mensaje, permanece leído
    mismo = avisos.generar_aviso_vencimientos(db_session, hoy=hoy)
    assert mismo.leida is True

    # Si aparece otro vencimiento y cambia el mensaje, vuelve a quedar sin leer
    _crear_documento(db_session, persona_operadora.id, "Libreta", hoy + timedelta(days=2))
    actualizado = avisos.generar_aviso_vencimientos(db_session, hoy=hoy)

    assert actualizado.id == aviso.id
    assert actualizado.leida is False


def test_conteo_de_no_leidas(db_session):
    db_session.add_all([
        Notificacion(
            clave="test-nl-1",
            tipo=TipoNotificacion.VENCIMIENTO_DOCUMENTACION,
            titulo="Aviso 1",
            mensaje="Mensaje 1",
            leida=False,
        ),
        Notificacion(
            clave="test-nl-2",
            tipo=TipoNotificacion.VENCIMIENTO_DOCUMENTACION,
            titulo="Aviso 2",
            mensaje="Mensaje 2",
            leida=False,
        ),
        Notificacion(
            clave="test-nl-3",
            tipo=TipoNotificacion.VENCIMIENTO_DOCUMENTACION,
            titulo="Aviso 3",
            mensaje="Mensaje 3",
            leida=True,
        ),
    ])
    db_session.commit()

    assert avisos.contar_no_leidas(db_session) == 2

    primera = db_session.scalar(select(Notificacion).where(Notificacion.clave == "test-nl-1"))
    avisos.marcar_leida(db_session, primera.id)
    assert avisos.contar_no_leidas(db_session) == 1

    marcadas = avisos.marcar_todas_leidas(db_session)
    assert marcadas == 1
    assert avisos.contar_no_leidas(db_session) == 0