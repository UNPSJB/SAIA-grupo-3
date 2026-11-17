import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from src.auth.router import router as auth_router
from src.auth.utils import get_password_hash
from src.database import get_db
from src.equipos.router import router as equipos_router
from src.insumos.router import router as insumos_router
from src.perfil.router import router as perfil_router
from src.personal.models import Personal
from src.personal.router import router as personal_router

PASSWORD = "clave-segura-123"


@pytest.fixture
def client(db_session):
    api = FastAPI()
    for router in (auth_router, personal_router, perfil_router, insumos_router, equipos_router):
        api.include_router(router)

    def conexion_pruebas():
        yield db_session

    api.dependency_overrides[get_db] = conexion_pruebas
    with TestClient(api) as cliente:
        yield cliente
    api.dependency_overrides.clear()


@pytest.fixture
def persona_con_login(db_session):
    persona = Personal(
        nombre="Martina",
        apellido="Gómez",
        dni="40111222",
        nroLegajo="L-400",
        email="martina@example.com",
        username="martina",
        hashed_password=get_password_hash(PASSWORD),
        operar=True,
        administrar=False,
        activo=True,
    )
    db_session.add(persona)
    db_session.commit()
    db_session.refresh(persona)
    return persona


@pytest.fixture
def persona_inactiva(db_session):
    persona = Personal(
        nombre="Pablo",
        apellido="Ruiz",
        dni="40333444",
        nroLegajo="L-401",
        email="pablo@example.com",
        username="pablo",
        hashed_password=get_password_hash(PASSWORD),
        operar=True,
        administrar=False,
        activo=False,
    )
    db_session.add(persona)
    db_session.commit()
    db_session.refresh(persona)
    return persona
