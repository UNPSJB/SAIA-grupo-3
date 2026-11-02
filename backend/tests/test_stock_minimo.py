"""Aceptación de stock mínimo; toda la persistencia se hace en SQLite aislado."""
from datetime import date
import sqlite3
from pathlib import Path

import pytest
from pydantic import ValidationError
from sqlalchemy import select, func

from tests.database import db_session, unidad_medida, insumo_activo, producto, persona_operadora  # noqa: F401
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
    return quimicos.crear_insumo_quimico(db, InsumoQuimicoCreate(
        nombre=nombre, cantidad=cantidad, stock_minimo=minimo,
        tipo_quimico=TipoQuimico.DETERGENTE, unidad_medida_id=unidad.id))


def usar(db, q, cantidad=5):
    return consumos.crear_consumo(db, ConsumoQuimicoCreate(
        insumo_quimico_id=q.id, cantidad_utilizada=cantidad,
        fecha=date.today(), tarea_limpieza='Limpieza demo'))


def cantidad_avisos(db):
    return db.scalar(select(func.count()).select_from(Notificacion))


@pytest.mark.parametrize('modelo', [InsumoCreate, InsumoQuimicoCreate])
@pytest.mark.parametrize('invalido', [-1, float('nan'), float('inf'), float('-inf')])
def test_minimo_invalido(modelo, invalido):
    with pytest.raises(ValidationError):
        modelo(nombre='Prueba', cantidad=0, stock_minimo=invalido,
               unidad_medida_id=1, tipo_quimico='detergente')


def test_consumo_umbral_no_duplica_y_reposicion_reactiva(db_session, unidad_medida):
    q=crear_quimico(db_session, unidad_medida)
    assert cantidad_avisos(db_session)==0
    c=usar(db_session,q)
    aviso=db_session.scalar(select(Notificacion))
    assert q.cantidad==5 and aviso and not aviso.resuelta
    aviso.leida=True; db_session.commit()
    usar(db_session,q,1)
    assert cantidad_avisos(db_session)==1 and aviso.leida
    quimicos.modificar_insumo_quimico(db_session,q.id,InsumoQuimicoUpdate(cantidad=11))
    assert aviso.resuelta and aviso.leida
    usar(db_session,q,6)
    assert cantidad_avisos(db_session)==1 and not aviso.resuelta and not aviso.leida
    consumos.eliminar_consumo(db_session,c.id)
    assert aviso.resuelta


def test_modificar_consumo_revisa_ambos_quimicos(db_session, unidad_medida):
    a=crear_quimico(db_session,unidad_medida)
    b=crear_quimico(db_session,unidad_medida,nombre='Otro')
    c=usar(db_session,a)
    consumos.modificar_consumo(db_session,c.id,ConsumoQuimicoUpdate(insumo_quimico_id=b.id))
    assert a.cantidad==10 and b.cantidad==5
    assert db_session.scalar(select(Notificacion).where(Notificacion.clave==f'stock-bajo-quimico-{a.id}')).resuelta
    assert not db_session.scalar(select(Notificacion).where(Notificacion.clave==f'stock-bajo-quimico-{b.id}')).resuelta
    consumos.eliminar_consumo(db_session,c.id)
    assert b.cantidad==10
    consumos.modificar_consumo(db_session,c.id,ConsumoQuimicoUpdate(activo=True))
    assert b.cantidad==5
    assert not db_session.scalar(select(Notificacion).where(Notificacion.clave==f'stock-bajo-quimico-{b.id}')).resuelta


@pytest.mark.parametrize('quimico', [False, True])
def test_sin_minimo_cero_y_quitar_minimo(db_session, unidad_medida, quimico):
    if quimico:
        i=crear_quimico(db_session,unidad_medida,cantidad=0,minimo=None)
        update=quimicos.modificar_insumo_quimico; schema=InsumoQuimicoUpdate
    else:
        i=ingredientes.crear_insumo(db_session,InsumoCreate(nombre='Harina',cantidad=0,unidad_medida_id=unidad_medida.id))
        update=ingredientes.modificar_insumo; schema=InsumoUpdate
    assert cantidad_avisos(db_session)==0
    update(db_session,i.id,schema(stock_minimo=0))
    aviso=db_session.scalar(select(Notificacion))
    assert aviso and not aviso.resuelta
    update(db_session,i.id,schema(stock_minimo=None))
    assert i.stock_minimo is None and aviso.resuelta


def test_filtro_contador_activos_y_scheduler(db_session, unidad_medida):
    for n in range(3):
        ingredientes.crear_insumo(db_session,InsumoCreate(nombre=f'Harina {n}',cantidad=n,stock_minimo=1,unidad_medida_id=unidad_medida.id))
    q=crear_quimico(db_session,unidad_medida,cantidad=1,minimo=1)
    filtro=ingredientes.listar_insumos(db_session,size=1,solo_stock_bajo=True)
    assert filtro['total']==2 and filtro['pages']==2 and len(filtro['items'])==1
    assert ingredientes.listar_insumos(db_session,buscar='Harina 2',solo_stock_bajo=True)['total']==0
    assert quimicos.listar_insumos_quimicos(db_session,solo_stock_bajo=True)['total']==1
    assert avisos.contar_stock_bajo(db_session)=={'insumos':2,'insumos_quimicos':1,'total':3}
    q.activo=False; db_session.commit()
    avisos.revisar_stock_todos(db_session)
    assert db_session.scalar(select(Notificacion).where(Notificacion.clave==f'stock-bajo-quimico-{q.id}')).resuelta
    assert avisos.contar_stock_bajo(db_session)['total']==2
    assert quimicos.listar_insumos_quimicos(db_session,mostrar_inactivos=True,solo_stock_bajo=True)['total']==0


def test_fallo_aviso_revierte_consumo(db_session, unidad_medida, monkeypatch):
    q=crear_quimico(db_session,unidad_medida)
    def fallo(*args,**kwargs): raise RuntimeError('fallo aviso')
    monkeypatch.setattr(avisos,'revisar_stock_insumo',fallo)
    with pytest.raises(RuntimeError): usar(db_session,q)
    assert db_session.get(InsumoQuimico,q.id).cantidad==10
    assert db_session.scalar(select(func.count()).select_from(ConsumoQuimico))==0
    assert cantidad_avisos(db_session)==0


def test_revisar_sin_confirmar_no_confirma_movimiento(db_session, unidad_medida):
    q=crear_quimico(db_session,unidad_medida)
    q.cantidad=5
    avisos.revisar_stock_insumo(db_session,q,confirmar=False)
    db_session.rollback()
    assert q.cantidad==10 and cantidad_avisos(db_session)==0


def test_migracion_repetible_con_respaldo_y_datos(tmp_path):
    path=tmp_path/'anterior.db'
    with sqlite3.connect(path) as db:
        db.executescript('CREATE TABLE insumos (id INTEGER, cantidad FLOAT); CREATE TABLE insumos_quimicos (id INTEGER); CREATE TABLE notificaciones (id INTEGER, leida BOOLEAN); INSERT INTO insumos VALUES (1, 12); INSERT INTO notificaciones VALUES (1, 1);')
    backup=migrar(path)
    assert backup.is_file() and migrar(path) is None
    with sqlite3.connect(path) as db:
        assert db.execute('SELECT cantidad, stock_minimo FROM insumos').fetchone()==(12,None)
        assert db.execute('SELECT leida, resuelta FROM notificaciones').fetchone()==(1,0)
    with sqlite3.connect(backup) as db:
        assert 'stock_minimo' not in {r[1] for r in db.execute('PRAGMA table_info(insumos)')}


@pytest.mark.parametrize('fallar', [False, True])
def test_checklist_aviso_y_rollback(db_session, unidad_medida, persona_operadora, monkeypatch, fallar):
    from src.plan.models import Plan
    from src.tarea.models import Tarea, TareaInsumoQuimico, FrecuenciaTarea
    from src.checklist.models import ItemChecklist, EstadoItem, MovimientoItemChecklist
    from src.checklist.services import finalizar_item_checklist
    from src.checklist.schemas import InsumoQuimicoConsumido
    q=crear_quimico(db_session,unidad_medida)
    tarea=Tarea(nombre='Limpiar',frecuencia=FrecuenciaTarea.DIARIA,procedimiento='Lavar',
                insumos_quimicos=[TareaInsumoQuimico(insumo_quimico_id=q.id,cantidad=5)])
    plan=Plan(nombre='Plan',descripcion='Prueba',responsable_id=persona_operadora.id,tareas=[tarea])
    db_session.add(plan); db_session.flush()
    item=ItemChecklist(plan_id=plan.id,tarea_id=tarea.id,responsable_id=persona_operadora.id,
                       frecuencia=FrecuenciaTarea.DIARIA,periodo_inicio=date.today(),periodo_fin=date.today())
    db_session.add(item); db_session.commit()
    def fallo(*args,**kwargs): raise RuntimeError('fallo aviso')
    if fallar: monkeypatch.setattr(avisos,'revisar_stock_insumo',fallo)
    def ejecutar():
        finalizar_item_checklist(db_session,item.id,persona_operadora.id,consumos=[
            InsumoQuimicoConsumido(insumo_quimico_id=q.id,cantidad_utilizada=5)])
    if fallar:
        with pytest.raises(RuntimeError): ejecutar()
        assert item.estado==EstadoItem.PENDIENTE and q.cantidad==10
        assert db_session.scalar(select(func.count()).select_from(MovimientoItemChecklist))==0
        assert cantidad_avisos(db_session)==0
    else:
        ejecutar()
        assert item.estado==EstadoItem.REALIZADA and q.cantidad==5 and cantidad_avisos(db_session)==1


@pytest.mark.parametrize('fallar', [False, True])
def test_produccion_origen_y_aviso_atomicos(db_session, insumo_activo, producto, persona_operadora, monkeypatch, fallar):
    from tests.stock_trazable import identificar_stock
    from src.loteProduccion.services import crear_lote
    from src.loteProduccion.schemas import LoteProduccionCreate, LoteInsumoCreate
    from src.loteProduccion.models import LoteProduccion
    from src.abastecimiento.models import LoteRecepcionInsumo, ConsumoLoteRecepcion
    identificar_stock(db_session,persona_operadora,insumo_activo)
    ingredientes.modificar_insumo(db_session,insumo_activo.id,InsumoUpdate(stock_minimo=45))
    def fallo(*args,**kwargs): raise RuntimeError('fallo aviso')
    if fallar: monkeypatch.setattr(avisos,'revisar_stock_insumo',fallo)
    def ejecutar():
        crear_lote(db_session,LoteProduccionCreate(producto_id=producto.id,fecha_produccion=date.today(),cantidad=1,
                   insumos=[LoteInsumoCreate(insumo_id=insumo_activo.id,cantidad_usada=5)]),persona_operadora.id)
    if fallar:
        with pytest.raises(RuntimeError): ejecutar()
        assert insumo_activo.cantidad==50
        assert db_session.scalar(select(LoteRecepcionInsumo)).cantidad_disponible==50
        assert db_session.scalar(select(func.count()).select_from(LoteProduccion))==0
        assert db_session.scalar(select(func.count()).select_from(ConsumoLoteRecepcion))==0
        assert cantidad_avisos(db_session)==0
    else:
        ejecutar()
        assert insumo_activo.cantidad==45 and cantidad_avisos(db_session)==1


def test_recepcion_resuelve_y_anulacion_reabre(db_session, insumo_activo, persona_operadora):
    from datetime import timedelta
    from uuid import uuid4
    from src.abastecimiento.models import Proveedor
    from src.abastecimiento.schemas import LoteInput
    from src.abastecimiento.services import guardar_recepcion, anular_recepcion
    ingredientes.modificar_insumo(db_session,insumo_activo.id,InsumoUpdate(stock_minimo=50))
    aviso=db_session.scalar(select(Notificacion))
    proveedor=Proveedor(nombre='Proveedor',cuit='30123456789',activo=True)
    db_session.add(proveedor); db_session.commit()
    datos=LoteInput(insumo_id=insumo_activo.id,proveedor_id=proveedor.id,numero_lote='RECEPCION',cantidad=10,
        fecha_recepcion=date.today(),fecha_vencimiento=date.today()+timedelta(days=30),clave_operacion=uuid4())
    recibido=guardar_recepcion(db_session,datos,persona_operadora.id)
    assert insumo_activo.cantidad==60 and aviso.resuelta
    guardar_recepcion(db_session,datos,persona_operadora.id)
    assert insumo_activo.cantidad==60
    anular_recepcion(db_session,recibido['id'])
    assert insumo_activo.cantidad==50 and not aviso.resuelta


def test_reactivar_consumo_con_otro_quimico_y_cantidad(db_session,unidad_medida):
    a=crear_quimico(db_session,unidad_medida)
    b=crear_quimico(db_session,unidad_medida,nombre='Otro')
    c=usar(db_session,a)
    consumos.eliminar_consumo(db_session,c.id)
    consumos.modificar_consumo(db_session,c.id,ConsumoQuimicoUpdate(activo=True,insumo_quimico_id=b.id,cantidad_utilizada=6))
    assert a.cantidad==10 and b.cantidad==4
    consumos.modificar_consumo(db_session,c.id,ConsumoQuimicoUpdate(activo=False))
    assert b.cantidad==10


def test_endpoint_filtros_contador_y_permisos(db_session,unidad_medida,persona_operadora):
    from fastapi import FastAPI
    from fastapi.testclient import TestClient
    from src.database import get_db
    from src.notificaciones.router import router as notificaciones_router
    from src.insumos.router import router as insumos_router
    from src.insumosQuimicos.router import router as quimicos_router
    from src.auth.utils import create_access_token
    api=FastAPI()
    for router in (notificaciones_router,insumos_router,quimicos_router): api.include_router(router)
    def get_test_db(): yield db_session
    api.dependency_overrides[get_db]=get_test_db
    crear_quimico(db_session,unidad_medida,cantidad=5)
    ingredientes.crear_insumo(db_session,InsumoCreate(nombre='Harina',cantidad=0,stock_minimo=0,unidad_medida_id=unidad_medida.id))
    with TestClient(api) as client:
        assert client.get('/notificaciones/stock-bajo/cantidad').status_code==401
        headers={'Authorization':f'Bearer {create_access_token(persona_operadora)}'}
        assert client.get('/notificaciones/stock-bajo/cantidad',headers=headers).status_code==403
        persona_operadora.administrar=True; db_session.commit()
        headers={'Authorization':f'Bearer {create_access_token(persona_operadora)}'}
        response=client.get('/notificaciones/stock-bajo/cantidad',headers=headers)
        assert response.status_code==200 and response.json()=={'insumos':1,'insumos_quimicos':1,'total':2}
        for ruta in ('/insumos/','/insumos-quimicos/'):
            response=client.get(ruta+'?solo_stock_bajo=true',headers=headers)
            assert response.status_code==200 and response.json()['total']==1
            assert response.json()['items'][0]['stock_bajo'] is True


def test_dos_revisiones_simultaneas_no_duplican(tmp_path):
    from concurrent.futures import ThreadPoolExecutor
    from threading import Barrier
    from sqlalchemy import create_engine
    from sqlalchemy.orm import Session
    from src.models import ModeloBase
    from src.unidadMedida.models import UnidadMedida, TipoUnidadMedida
    motor=create_engine(f"sqlite:///{tmp_path/'concurrencia.db'}",connect_args={'timeout':10})
    ModeloBase.metadata.create_all(motor)
    with Session(motor) as db:
        u=UnidadMedida(tipo=TipoUnidadMedida.PESO,sufijo='kg',activo=True)
        db.add(u); db.flush()
        i=Insumo(nombre='Prueba',cantidad=5,stock_minimo=5,unidad_medida_id=u.id,activo=True)
        db.add(i); db.commit(); identificador=i.id
    barrier=Barrier(2)
    def revisar_en_sesion():
        with Session(motor) as db:
            i=db.get(Insumo,identificador)
            barrier.wait(timeout=5)
            avisos.revisar_stock_insumo(db,i)
    try:
        with ThreadPoolExecutor(max_workers=2) as pool:
            futuros=[pool.submit(revisar_en_sesion) for _ in range(2)]
            for futuro in futuros: futuro.result(timeout=15)
        with Session(motor) as db:
            assert cantidad_avisos(db)==1
    finally:
        motor.dispose()