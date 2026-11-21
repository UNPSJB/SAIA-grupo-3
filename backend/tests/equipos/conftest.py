import pytest

from src.equipos.models import Equipo, TipoEquipo
from src.sector.models import Sector


def guardar(db_session, objeto):
    db_session.add(objeto)
    db_session.commit()
    db_session.refresh(objeto)
    return objeto


@pytest.fixture
def sector_cocina(db_session):
    return guardar(db_session, Sector(nombre="Cocina", activo=True))


@pytest.fixture
def sector_panaderia(db_session):
    return guardar(db_session, Sector(nombre="Panadería", activo=True))


@pytest.fixture
def sector_inactivo(db_session):
    return guardar(db_session, Sector(nombre="Depósito viejo", activo=False))


@pytest.fixture
def equipo_balanza(db_session, sector_cocina):
    return guardar(db_session, Equipo(
        numero_serie="BAL-001",
        nombre="Balanza",
        tipo=TipoEquipo.INSTRUMENTO,
        sector_id=sector_cocina.id,
        activo=True,
    ))


@pytest.fixture
def equipo_horno(db_session, sector_panaderia):
    return guardar(db_session, Equipo(
        numero_serie="HOR-001",
        nombre="Horno",
        tipo=TipoEquipo.EQUIPO,
        sector_id=sector_panaderia.id,
        activo=True,
    ))


@pytest.fixture
def equipo_dado_de_baja(db_session, sector_cocina):
    return guardar(db_session, Equipo(
        numero_serie="FRE-001",
        nombre="Freidora",
        tipo=TipoEquipo.EQUIPO,
        sector_id=sector_cocina.id,
        activo=False,
    ))
