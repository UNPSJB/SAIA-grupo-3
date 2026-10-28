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
from tests.database import session  # noqa: F401 — fixture de pytest


def crear_personal(session, *, dni: str, activo: bool = True, administrar: bool = False):
    personal = Personal(
        dni=dni,
        nroLegajo=dni,
        nombre="Ana",
        apellido="Pérez",
        email=f"{dni}@example.com",
        username=dni,
        hashed_password="x",
        operar=True,
        administrar=administrar,
        activo=activo,
    )
    session.add(personal)
    session.flush()
    return personal


def test_listar_consolidados_une_ordena_filtra_y_pagina(session):
    hoy = date(2026, 1, 1)
    personal = crear_personal(session, dni="111")
    personal_inactivo = crear_personal(session, dni="222", activo=False)
    tipo = TipoDocumento(nombre="Carnet", activo=True)
    sector = Sector(nombre="Producción", activo=True)
    session.add_all([tipo, sector])
    session.flush()
    session.add_all(
        [
            Documentacion(
                tipo_documento_id=tipo.id,
                personal_id=personal.id,
                fecha_vencimiento=hoy - timedelta(days=20),
            ),
            Documentacion(
                tipo_documento_id=tipo.id,
                personal_id=personal_inactivo.id,
                fecha_vencimiento=hoy - timedelta(days=30),
            ),
        ]
    )
    equipos = [
        Equipo(
            numero_serie="E-1",
            nombre="Balanza",
            tipo=TipoEquipo.EQUIPO,
            activo=True,
            sector_id=sector.id,
            fecha_ultima_calibracion=hoy - timedelta(days=40),
            periodicidad_dias=10,
        ),
        Equipo(
            numero_serie="E-2",
            nombre="Termómetro",
            tipo=TipoEquipo.INSTRUMENTO,
            activo=True,
            sector_id=sector.id,
            fecha_ultima_calibracion=hoy,
            periodicidad_dias=20,
        ),
        Equipo(
            numero_serie="E-3",
            nombre="Inactivo",
            tipo=TipoEquipo.HERRAMIENTA,
            activo=False,
            sector_id=sector.id,
            fecha_ultima_calibracion=hoy - timedelta(days=50),
            periodicidad_dias=1,
        ),
    ]
    session.add_all(equipos)
    session.commit()

    resultado = listar_vencimientos_consolidados(session, page=1, size=2, hoy=hoy)

    assert resultado["total"] == 3
    assert resultado["pages"] == 2
    assert [item["origen"] for item in resultado["items"]] == [
        "calibracion",
        "documentacion",
    ]
    assert [item["fecha_vencimiento"] for item in resultado["items"]] == [
        hoy - timedelta(days=30),
        hoy - timedelta(days=20),
    ]
    assert resultado["items"][0]["estado"] == "vencido"
    assert resultado["items"][0]["detalle_id"] == equipos[0].id
    assert resultado["items"][1]["detalle_id"] == personal.id

    solo_calibracion = listar_vencimientos_consolidados(
        session, page=1, size=10, origen="calibracion", hoy=hoy
    )
    assert solo_calibracion["total"] == 2
    assert all(item["origen"] == "calibracion" for item in solo_calibracion["items"])

    vencidos = listar_vencimientos_consolidados(
        session,
        page=1,
        size=10,
        estado="vencido",
        buscar="ana",
        ordenar_por="elemento",
        orden="desc",
        hoy=hoy,
    )
    assert vencidos["total"] == 1
    assert vencidos["items"][0]["personal"].nombre == "Ana"
    assert vencidos["items"][0]["estado"] == "vencido"

    equipos_por_nombre = listar_vencimientos_consolidados(
        session,
        page=1,
        size=10,
        origen="calibracion",
        buscar="e-",
        ordenar_por="elemento",
        orden="desc",
        hoy=hoy,
    )
    assert [item["equipo"].numero_serie for item in equipos_por_nombre["items"]] == [
        "E-2",
        "E-1",
    ]


def test_listar_consolidados_solo_alertas_incluye_vencidos_y_proximos(session):
    hoy = date(2026, 1, 1)
    personal = crear_personal(session, dni="555")
    tipo = TipoDocumento(nombre="Certificado", activo=True)
    sector = Sector(nombre="Laboratorio")
    session.add_all([tipo, sector])
    session.flush()

    fecha_vencimiento_proxima = hoy + timedelta(days=DIAS_AVISO_VENCIMIENTO)
    session.add_all(
        [
            Documentacion(
                tipo_documento_id=tipo.id,
                personal_id=personal.id,
                fecha_vencimiento=hoy - timedelta(days=1),
            ),
            Equipo(
                numero_serie="CERCA",
                nombre="Equipo próximo",
                tipo=TipoEquipo.EQUIPO,
                activo=True,
                sector_id=sector.id,
                fecha_ultima_calibracion=fecha_vencimiento_proxima
                - timedelta(days=30),
                periodicidad_dias=30,
            ),
            Equipo(
                numero_serie="LEJOS",
                nombre="Equipo vigente",
                tipo=TipoEquipo.INSTRUMENTO,
                activo=True,
                sector_id=sector.id,
                fecha_ultima_calibracion=fecha_vencimiento_proxima
                + timedelta(days=1)
                - timedelta(days=30),
                periodicidad_dias=30,
            ),
        ]
    )
    session.commit()

    resultado = listar_vencimientos_consolidados(
        session, page=1, size=10, solo_alertas=True, hoy=hoy
    )

    assert resultado["total"] == 2
    assert {item["origen"] for item in resultado["items"]} == {
        "documentacion",
        "calibracion",
    }
    assert all(
        item["fecha_vencimiento"]
        <= hoy + timedelta(days=DIAS_AVISO_VENCIMIENTO)
        for item in resultado["items"]
    )


def test_listar_calibraciones_solo_alertas_incluye_vencidas_y_proximas(session):
    hoy = date(2026, 1, 1)
    sector = Sector(nombre="Planta")
    session.add(sector)
    session.flush()
    fechas_vencimiento = [
        hoy - timedelta(days=1),
        hoy + timedelta(days=DIAS_AVISO_VENCIMIENTO),
        hoy + timedelta(days=DIAS_AVISO_VENCIMIENTO + 1),
    ]
    for indice, fecha_vencimiento in enumerate(fechas_vencimiento, start=1):
        session.add(
            Equipo(
                numero_serie=f"CAL-{indice}",
                nombre=f"Equipo {indice}",
                tipo=TipoEquipo.EQUIPO,
                activo=True,
                sector_id=sector.id,
                fecha_ultima_calibracion=fecha_vencimiento - timedelta(days=30),
                periodicidad_dias=30,
            )
        )
    session.commit()

    resultado = listar_vencimientos_calibracion(
        session, page=1, size=10, solo_alertas=True, hoy=hoy
    )

    assert resultado["total"] == 2
    assert {item["estado"] for item in resultado["items"]} == {
        "vencido",
        "por_vencer",
    }


def test_endpoint_consolidado_requiere_permiso_administrar(session):
    operador = crear_personal(session, dni="333")
    administrador = crear_personal(
        session, dni="444", administrar=True
    )
    tipo = TipoDocumento(nombre="Certificado", activo=True)
    sector = Sector(nombre="Depósito")
    session.add_all([tipo, sector])
    session.flush()
    session.add(
        Documentacion(
            tipo_documento_id=tipo.id,
            personal_id=operador.id,
            fecha_vencimiento=date.today() + timedelta(days=5),
        )
    )
    session.add(
        Equipo(
            numero_serie="E-4",
            nombre="Balanza",
            tipo=TipoEquipo.EQUIPO,
            activo=True,
            sector_id=sector.id,
            fecha_ultima_calibracion=date.today(),
            periodicidad_dias=10,
        )
    )
    session.commit()

    app = FastAPI()
    app.include_router(vencimientos_router)
    app.dependency_overrides[get_db] = lambda: session
    client = TestClient(app)
    try:
        respuesta_operador = client.get(
            "/vencimientos/consolidados",
            headers={"Authorization": f"Bearer {create_access_token(operador)}"},
        )
        respuesta_administrador = client.get(
            "/vencimientos/consolidados",
            headers={"Authorization": f"Bearer {create_access_token(administrador)}"},
        )
        respuesta_filtrada = client.get(
            "/vencimientos/consolidados?estado=por_vencer&buscar=Certificado&ordenar_por=elemento&orden=desc",
            headers={"Authorization": f"Bearer {create_access_token(administrador)}"},
        )
    finally:
        client.close()
        app.dependency_overrides.clear()

    assert respuesta_operador.status_code == 403
    assert respuesta_administrador.status_code == 200, respuesta_administrador.text
    resultado = respuesta_administrador.json()
    assert resultado["total"] == 2
    assert {item["origen"] for item in resultado["items"]} == {
        "documentacion",
        "calibracion",
    }
    item_documentacion = next(
        item for item in resultado["items"] if item["origen"] == "documentacion"
    )
    item_calibracion = next(
        item for item in resultado["items"] if item["origen"] == "calibracion"
    )
    assert item_documentacion["personal"]["id"] == operador.id
    assert item_documentacion["tipo_documento"]["nombre"] == "Certificado"
    assert item_calibracion["equipo"]["nombre"] == "Balanza"
    assert item_calibracion["sector"]["nombre"] == "Depósito"
    assert respuesta_filtrada.status_code == 200, respuesta_filtrada.text
    resultado_filtrado = respuesta_filtrada.json()
    assert resultado_filtrado["total"] == 1
    assert resultado_filtrado["items"][0]["origen"] == "documentacion"
