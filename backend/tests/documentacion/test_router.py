from datetime import date, timedelta
from fastapi import FastAPI
from fastapi.testclient import TestClient
from src.auth.utils import create_access_token
from src.database import get_db
from src.documentacion.models import Documentacion
from src.documentacion.router import vencimientos_router
from src.documentacion.vencimientos import listar_vencimientos_consolidados
from src.equipos.models import Equipo, TipoEquipo
from src.personal.models import Personal
from src.documentacion.constants import DIAS_AVISO_VENCIMIENTO
from src.registroCalibracion.vencimientos import listar_vencimientos_calibracion
from src.sector.models import Sector
from src.tipoDocumento.models import TipoDocumento
from tests.database import db_session as session

def crear_personal(session, *, dni: str, activo: bool=True, administrar: bool=False):
    personal = Personal(dni=dni, nroLegajo=dni, nombre='Ana', apellido='Pérez', email=f'{dni}@example.com', username=dni, hashed_password='x', operar=True, administrar=administrar, activo=activo)
    session.add(personal)
    session.flush()
    return personal

def test_endpoint_consolidado_requiere_permiso_administrar(session):
    operador = crear_personal(session, dni='333')
    administrador = crear_personal(session, dni='444', administrar=True)
    tipo = TipoDocumento(nombre='Certificado', activo=True)
    sector = Sector(nombre='Depósito')
    session.add_all([tipo, sector])
    session.flush()
    session.add(Documentacion(tipo_documento_id=tipo.id, personal_id=operador.id, fecha_vencimiento=date.today() + timedelta(days=5)))
    session.add(Equipo(numero_serie='E-4', nombre='Balanza', tipo=TipoEquipo.EQUIPO, activo=True, sector_id=sector.id, fecha_ultima_calibracion=date.today(), periodicidad_dias=10))
    session.commit()
    app = FastAPI()
    app.include_router(vencimientos_router)
    app.dependency_overrides[get_db] = lambda: session
    client = TestClient(app)
    try:
        respuesta_operador = client.get('/vencimientos/consolidados', headers={'Authorization': f'Bearer {create_access_token(operador)}'})
        respuesta_administrador = client.get('/vencimientos/consolidados', headers={'Authorization': f'Bearer {create_access_token(administrador)}'})
        respuesta_filtrada = client.get('/vencimientos/consolidados?estado=por_vencer&buscar=Certificado&ordenar_por=elemento&orden=desc', headers={'Authorization': f'Bearer {create_access_token(administrador)}'})
    finally:
        client.close()
        app.dependency_overrides.clear()
    assert respuesta_operador.status_code == 403
    assert respuesta_administrador.status_code == 200, respuesta_administrador.text
    resultado = respuesta_administrador.json()
    assert resultado['total'] == 2
    assert {item['origen'] for item in resultado['items']} == {'documentacion', 'calibracion'}
    item_documentacion = next((item for item in resultado['items'] if item['origen'] == 'documentacion'))
    item_calibracion = next((item for item in resultado['items'] if item['origen'] == 'calibracion'))
    assert item_documentacion['personal']['id'] == operador.id
    assert item_documentacion['tipo_documento']['nombre'] == 'Certificado'
    assert item_calibracion['equipo']['nombre'] == 'Balanza'
    assert item_calibracion['sector']['nombre'] == 'Depósito'
    assert respuesta_filtrada.status_code == 200, respuesta_filtrada.text
    resultado_filtrado = respuesta_filtrada.json()
    assert resultado_filtrado['total'] == 1
    assert resultado_filtrado['items'][0]['origen'] == 'documentacion'

def test_listar_documentos_filtrando_por_personal(
    client,
    headers_administradora,
    persona_operadora,
    otro_personal,
    tipo_carnet,
    tipo_libreta,
):
    vencimiento = (date.today() + timedelta(days=60)).isoformat()

    doc_1 = client.post(
        "/documentacion/",
        headers=headers_administradora,
        json={
            "personal_id": persona_operadora.id,
            "tipo_documento_id": tipo_carnet.id,
            "fecha_vencimiento": vencimiento,
        },
    )
    assert doc_1.status_code == 200, doc_1.text

    doc_2 = client.post(
        "/documentacion/",
        headers=headers_administradora,
        json={
            "personal_id": otro_personal.id,
            "tipo_documento_id": tipo_libreta.id,
            "fecha_vencimiento": vencimiento,
        },
    )
    assert doc_2.status_code == 200, doc_2.text

    todos = client.get("/documentacion/", headers=headers_administradora)
    assert todos.status_code == 200
    assert len(todos.json()) == 2

    filtrados = client.get(
        "/documentacion/",
        headers=headers_administradora,
        params={"personal_id": otro_personal.id},
    )
    assert filtrados.status_code == 200
    assert [d["id"] for d in filtrados.json()] == [doc_2.json()["id"]]


def test_listado_vencimientos_filtrado_por_estado_y_solo_alertas(
    client,
    headers_administradora,
    persona_operadora,
    tipo_carnet,
    tipo_libreta,
):
    hoy = date.today()
    fechas = {
        "vencido": (hoy - timedelta(days=5)).isoformat(),
        "por_vencer": (hoy + timedelta(days=DIAS_AVISO_VENCIMIENTO)).isoformat(),
        "vigente": (hoy + timedelta(days=DIAS_AVISO_VENCIMIENTO + 30)).isoformat(),
    }

    for fecha in fechas.values():
        res = client.post(
            "/documentacion/",
            headers=headers_administradora,
            json={
                "personal_id": persona_operadora.id,
                "tipo_documento_id": tipo_carnet.id,
                "fecha_vencimiento": fecha,
            },
        )
        assert res.status_code == 200, res.text

    for estado in ("vencido", "por_vencer", "vigente"):
        res = client.get(
            "/documentacion/vencimientos",
            headers=headers_administradora,
            params={"estado": estado},
        )
        assert res.status_code == 200
        assert res.json()["total"] == 1
        assert res.json()["items"][0]["estado"] == estado

    alertas = client.get(
        "/documentacion/vencimientos",
        headers=headers_administradora,
        params={"solo_alertas": True},
    )
    assert alertas.status_code == 200
    assert alertas.json()["total"] == 2
    assert {item["estado"] for item in alertas.json()["items"]} == {"vencido", "por_vencer"}


def test_vencimientos_busqueda_por_empleado_dni_o_tipo_documento(
    client,
    headers_administradora,
    persona_operadora,
    otro_personal,
    tipo_carnet,
    tipo_libreta,
):
    vencimiento = (date.today() + timedelta(days=10)).isoformat()

    client.post(
        "/documentacion/",
        headers=headers_administradora,
        json={
            "personal_id": persona_operadora.id,
            "tipo_documento_id": tipo_carnet.id,
            "fecha_vencimiento": vencimiento,
        },
    )
    client.post(
        "/documentacion/",
        headers=headers_administradora,
        json={
            "personal_id": otro_personal.id,
            "tipo_documento_id": tipo_libreta.id,
            "fecha_vencimiento": vencimiento,
        },
    )

    for termino in ("Gómez", "Carlos", "35123456", "libreta"):
        res = client.get(
            "/documentacion/vencimientos",
            headers=headers_administradora,
            params={"buscar": termino},
        )
        assert res.status_code == 200
        assert res.json()["total"] == 1
        assert res.json()["items"][0]["personal"]["id"] == otro_personal.id


def test_eliminar_documento(
    client, headers_administradora, persona_operadora, tipo_carnet
):
    creado = client.post(
        "/documentacion/",
        headers=headers_administradora,
        json={
            "personal_id": persona_operadora.id,
            "tipo_documento_id": tipo_carnet.id,
            "fecha_vencimiento": (date.today() + timedelta(days=5)).isoformat(),
        },
    )
    assert creado.status_code == 200, creado.text
    doc_id = creado.json()["id"]

    eliminado = client.delete(f"/documentacion/{doc_id}", headers=headers_administradora)
    assert eliminado.status_code == 200
    assert eliminado.json()["id"] == doc_id

    assert client.get(f"/documentacion/{doc_id}", headers=headers_administradora).status_code == 404
    assert client.get("/documentacion/", headers=headers_administradora).json() == []