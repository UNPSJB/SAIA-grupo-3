"""Aceptación de stock mínimo; toda la persistencia se hace en SQLite aislado."""
from datetime import date
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
from scripts.migrate_stock_minimo import migrar

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
