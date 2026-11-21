import pytest

from src.equipos.models import Equipo, TipoEquipo
from src.sector.models import Sector


def guardar(db_session, objeto):
    db_session.add(objeto)
    db_session.commit()
    db_session.refresh(objeto)
    return objeto


@pytest.fixture
def sector_laboratorio(db_session):
    return guardar(db_session, Sector(nombre="Laboratorio", activo=True))


@pytest.fixture
def sector_panaderia(db_session):
    return guardar(db_session, Sector(nombre="Panadería", activo=True))


@pytest.fixture
def equipo_con_periodicidad(db_session, sector_laboratorio):
    return guardar(
        db_session,
        Equipo(
            numero_serie="BAL-100",
            nombre="Balanza de precisión",
            tipo=TipoEquipo.INSTRUMENTO,
            sector_id=sector_laboratorio.id,
            periodicidad_dias=90,
            activo=True,
        ),
    )


@pytest.fixture
def equipo_sin_periodicidad(db_session, sector_laboratorio):
    return guardar(
        db_session,
        Equipo(
            numero_serie="MES-200",
            nombre="Mesa de acero",
            tipo=TipoEquipo.EQUIPO,
            sector_id=sector_laboratorio.id,
            periodicidad_dias=None,
            activo=True,
        ),
    )


@pytest.fixture
def equipo_inactivo(db_session, sector_laboratorio):
    return guardar(
        db_session,
        Equipo(
            numero_serie="OLD-300",
            nombre="Termómetro viejo",
            tipo=TipoEquipo.INSTRUMENTO,
            sector_id=sector_laboratorio.id,
            periodicidad_dias=60,
            activo=False,
        ),
    )