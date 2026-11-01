from datetime import date, timedelta
from uuid import uuid4

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from src.abastecimiento import schemas, services
from src.abastecimiento.router import router
from src.auth.utils import create_access_token
from src.database import get_db
from src.documentacion.constants import DIAS_AVISO_VENCIMIENTO
from tests.database import (  # noqa: F401 — fixtures compartidas del proyecto
    db_session,
    insumo_activo,
    persona_operadora,
    producto,
    unidad_medida,
)


@pytest.fixture
def client(db_session):
    app = FastAPI()
    app.include_router(router)

    def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    try:
        with TestClient(app) as test_client:
            yield test_client
    finally:
        app.dependency_overrides.clear()


@pytest.fixture
def auth_headers(db_session, persona_operadora):
    persona_operadora.administrar = True
    db_session.commit()
    token = create_access_token(persona_operadora)
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def headers_operadora(persona_operadora):
    token = create_access_token(persona_operadora)
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def datos_proveedor():
    return {
        "nombre": "Molino de prueba",
        "cuit": "30-12345678-9",
        "telefono": "1123456789",
        "email": "molino@example.com",
        "numero_habilitacion": "HAB-PRUEBA",
        "vencimiento_habilitacion": (
            date.today() + timedelta(days=DIAS_AVISO_VENCIMIENTO)
        ).isoformat(),
    }


@pytest.fixture
def proveedor(db_session, datos_proveedor):
    return services.guardar_proveedor(
        db_session, schemas.ProveedorInput(**datos_proveedor)
    )


@pytest.fixture
def datos_lote(insumo_activo, proveedor):
    return {
        "insumo_id": insumo_activo.id,
        "proveedor_id": proveedor["id"],
        "numero_lote": "HAR-001",
        "cantidad": 10,
        "fecha_recepcion": (date.today() - timedelta(days=2)).isoformat(),
        "fecha_vencimiento": (
            date.today() + timedelta(days=DIAS_AVISO_VENCIMIENTO)
        ).isoformat(),
        "clave_operacion": str(uuid4()),
    }


@pytest.fixture
def lote(db_session, datos_lote, persona_operadora):
    return services.guardar_recepcion(
        db_session, schemas.LoteInput(**datos_lote), persona_operadora.id
    )
