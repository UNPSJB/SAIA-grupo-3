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

def test_endpoint_filtros_contador_y_permisos(db_session, unidad_medida, persona_operadora):
    from fastapi import FastAPI
    from fastapi.testclient import TestClient
    from src.database import get_db
    from src.notificaciones.router import router as notificaciones_router
    from src.insumos.router import router as insumos_router
    from src.insumosQuimicos.router import router as quimicos_router
    from src.auth.utils import create_access_token
    api = FastAPI()
    for router in (notificaciones_router, insumos_router, quimicos_router):
        api.include_router(router)

    def get_test_db():
        yield db_session
    api.dependency_overrides[get_db] = get_test_db
    crear_quimico(db_session, unidad_medida, cantidad=5)
    ingredientes.crear_insumo(db_session, InsumoCreate(nombre='Harina', stock_minimo=0, unidad_medida_id=unidad_medida.id))
    with TestClient(api) as client:
        assert client.get('/notificaciones/stock-bajo/cantidad').status_code == 401
        headers = {'Authorization': f'Bearer {create_access_token(persona_operadora)}'}
        assert client.get('/notificaciones/stock-bajo/cantidad', headers=headers).status_code == 403
        persona_operadora.administrar = True
        db_session.commit()
        headers = {'Authorization': f'Bearer {create_access_token(persona_operadora)}'}
        response = client.get('/notificaciones/stock-bajo/cantidad', headers=headers)
        assert response.status_code == 200 and response.json() == {'insumos': 1, 'insumos_quimicos': 1, 'total': 2}
        for ruta in ('/insumos/', '/insumos-quimicos/'):
            response = client.get(ruta + '?solo_stock_bajo=true', headers=headers)
            assert response.status_code == 200 and response.json()['total'] == 1
            assert response.json()['items'][0]['stock_bajo'] is True


def test_stock_bajo_aparece_en_campana_y_no_se_repite(client,db_session,unidad_medida,admin_headers):
    from src.notificaciones.services import revisar_stock_todos
    q=crear_quimico(db_session,unidad_medida,cantidad=4,minimo=5)
    revisar_stock_todos(db_session);revisar_stock_todos(db_session)
    r=client.get('/notificaciones/',headers=admin_headers)
    assert r.status_code==200
    avisos=[n for n in r.json() if q.nombre in n['mensaje']]
    assert len(avisos)==1
    assert 'solo_stock_bajo=true' in avisos[0]['enlace']
    id_=avisos[0]['id']
    assert client.patch(f'/notificaciones/{id_}/leer',headers=admin_headers).status_code==200
    revisar_stock_todos(db_session)
    assert client.get('/notificaciones/no-leidas/cantidad',headers=admin_headers).json()['cantidad']==0
