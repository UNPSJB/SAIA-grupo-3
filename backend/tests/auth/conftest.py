import pytest

from src.auth.utils import get_password_hash
from src.personal.models import Personal

PASSWORD = "clave-segura-123"


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
