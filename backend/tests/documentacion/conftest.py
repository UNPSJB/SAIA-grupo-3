import pytest

from src.personal.models import Personal
from src.tipoDocumento.models import TipoDocumento


def guardar(db_session, objeto):
    db_session.add(objeto)
    db_session.commit()
    db_session.refresh(objeto)
    return objeto


@pytest.fixture
def tipo_carnet(db_session):
    return guardar(db_session, TipoDocumento(nombre="Carnet de manipulador", activo=True))


@pytest.fixture
def tipo_libreta(db_session):
    return guardar(db_session, TipoDocumento(nombre="Libreta sanitaria", activo=True))


@pytest.fixture
def tipo_inactivo(db_session):
    return guardar(db_session, TipoDocumento(nombre="Documento antiguo", activo=False))


@pytest.fixture
def otro_personal(db_session):
    return guardar(
        db_session,
        Personal(
            nombre="Carlos",
            apellido="Gómez",
            dni="35123456",
            nroLegajo="L-850",
            email="carlos.doc@example.com",
            username="carlos_doc",
            hashed_password="unused",
            operar=True,
            administrar=False,
            activo=True,
        ),
    )