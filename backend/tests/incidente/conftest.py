import pytest

from src.auth.utils import create_access_token
from src.personal.models import Personal
from src.tipoIncidente.models import TipoIncidente


def guardar(db_session, objeto):
    db_session.add(objeto)
    db_session.commit()
    db_session.refresh(objeto)
    return objeto


@pytest.fixture
def tipo_plagas(db_session):
    return guardar(db_session, TipoIncidente(nombre="Plagas", color="danger", activo=True))


@pytest.fixture
def tipo_higiene(db_session):
    return guardar(db_session, TipoIncidente(nombre="Higiene", color="info", activo=True))


@pytest.fixture
def tipo_sin_uso(db_session):
    return guardar(db_session, TipoIncidente(nombre="Sin uso", color="secondary", activo=True))


@pytest.fixture
def otra_operadora(db_session):
    return guardar(
        db_session,
        Personal(
            nombre="Sofía",
            apellido="Operaria",
            dni="801",
            nroLegajo="L-801",
            email="sofia.incidente@example.com",
            username="sofia_incidente",
            hashed_password="unused",
            operar=True,
            administrar=False,
            activo=True,
        ),
    )


@pytest.fixture
def headers_otra_operadora(otra_operadora):
    return {"Authorization": f"Bearer {create_access_token(otra_operadora)}"}


@pytest.fixture
def operadora_inactiva(db_session):
    return guardar(
        db_session,
        Personal(
            nombre="Inactiva",
            apellido="Operaria",
            dni="802",
            nroLegajo="L-802",
            email="inactiva.incidente@example.com",
            username="inactiva_incidente",
            hashed_password="unused",
            operar=True,
            administrar=False,
            activo=False,
        ),
    )