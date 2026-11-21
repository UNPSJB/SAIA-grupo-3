"""Aceptación de stock mínimo; toda la persistencia se hace en SQLite aislado."""
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
from scripts.migrate_stock_minimo import migrar
from src.notificaciones.constants import ErrorCode
from src.notificaciones.models import TipoNotificacion

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

def _crear_notificaciones_prueba(db_session):
    ahora = datetime.now()
    n1 = Notificacion(
        clave="router-n1",
        tipo=TipoNotificacion.VENCIMIENTO_DOCUMENTACION,
        titulo="Aviso antiguo",
        mensaje="Mensaje 1",
        fecha_creacion=ahora - timedelta(hours=2),
        leida=False,
    )
    n2 = Notificacion(
        clave="router-n2",
        tipo=TipoNotificacion.VENCIMIENTO_DOCUMENTACION,
        titulo="Aviso leído",
        mensaje="Mensaje 2",
        fecha_creacion=ahora - timedelta(hours=1),
        leida=True,
    )
    n3 = Notificacion(
        clave="router-n3",
        tipo=TipoNotificacion.VENCIMIENTO_DOCUMENTACION,
        titulo="Aviso reciente",
        mensaje="Mensaje 3",
        fecha_creacion=ahora,
        leida=False,
    )
    db_session.add_all([n1, n2, n3])
    db_session.commit()
    return n1, n2, n3


def test_listado_de_notificaciones_y_filtro_solo_no_leidas(
    client, db_session, admin_headers
):
    n1, n2, n3 = _crear_notificaciones_prueba(db_session)

    todas = client.get("/notificaciones/", headers=admin_headers)
    assert todas.status_code == 200
    assert [n["id"] for n in todas.json()] == [n3.id, n2.id, n1.id]

    no_leidas = client.get(
        "/notificaciones/",
        headers=admin_headers,
        params={"solo_no_leidas": True},
    )
    assert no_leidas.status_code == 200
    assert [n["id"] for n in no_leidas.json()] == [n3.id, n1.id]


def test_marcar_una_como_leida_y_marcar_todas(client, db_session, admin_headers):
    n1, _, n3 = _crear_notificaciones_prueba(db_session)

    assert (
        client.get("/notificaciones/no-leidas/cantidad", headers=admin_headers).json()
        == {"cantidad": 2}
    )

    una = client.patch(f"/notificaciones/{n1.id}/leer", headers=admin_headers)
    assert una.status_code == 200
    assert una.json()["leida"] is True

    assert (
        client.get("/notificaciones/no-leidas/cantidad", headers=admin_headers).json()
        == {"cantidad": 1}
    )

    todas = client.patch("/notificaciones/leer-todas", headers=admin_headers)
    assert todas.status_code == 200
    assert todas.json() == {"cantidad": 1}

    assert (
        client.get("/notificaciones/no-leidas/cantidad", headers=admin_headers).json()
        == {"cantidad": 0}
    )
    assert (
        client.get(
            "/notificaciones/",
            headers=admin_headers,
            params={"solo_no_leidas": True},
        ).json()
        == []
    )


def test_notificacion_inexistente_devuelve_404(client, admin_headers):
    respuesta = client.patch("/notificaciones/999999/leer", headers=admin_headers)

    assert respuesta.status_code == 404
    assert respuesta.json()["detail"] == ErrorCode.NOTIFICACION_NO_ENCONTRADA