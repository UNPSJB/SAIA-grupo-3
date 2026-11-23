import pytest

from src.incidente import schemas as incidente_schemas
from src.incidente import services as incidente_services
from src.tipoIncidente.models import TipoIncidente


@pytest.fixture
def tipo_incidente(db_session):
    tipo = TipoIncidente(nombre="Higiene y limpieza", color="info", activo=True)
    db_session.add(tipo)
    db_session.commit()
    db_session.refresh(tipo)
    return tipo


@pytest.fixture
def incidente_abierto(db_session, persona_operadora, tipo_incidente):
    return incidente_services.crear_incidente(
        db_session,
        incidente_schemas.IncidenteCreate(
            descripcion="Mesada sin sanitizar al inicio del turno",
            tipo_id=tipo_incidente.id,
        ),
        persona_operadora.dni,
    )