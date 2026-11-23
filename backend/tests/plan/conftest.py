import pytest

from src.equipos.models import Equipo, TipoEquipo
from src.sector.models import Sector
from src.tarea.models import FrecuenciaTarea, Tarea


def guardar(db_session, objeto):
    db_session.add(objeto)
    db_session.commit()
    db_session.refresh(objeto)
    return objeto


@pytest.fixture
def sector_cocina(db_session):
    return guardar(db_session, Sector(nombre="Cocina", activo=True))


@pytest.fixture
def equipo_horno(db_session, sector_cocina):
    return guardar(
        db_session,
        Equipo(
            numero_serie="HOR-001",
            nombre="Horno",
            tipo=TipoEquipo.EQUIPO,
            sector_id=sector_cocina.id,
            activo=True,
        ),
    )


@pytest.fixture
def tarea_limpieza_horno(db_session, equipo_horno):
    return guardar(
        db_session,
        Tarea(
            nombre="Limpieza de horno",
            frecuencia=FrecuenciaTarea.DIARIA,
            procedimiento="Retirar residuos y aplicar desengrasante.",
            equipo_id=equipo_horno.id,
        ),
    )


@pytest.fixture
def tarea_desinfeccion_mesada(db_session):
    return guardar(
        db_session,
        Tarea(
            nombre="Desinfección de mesada",
            frecuencia=FrecuenciaTarea.SEMANAL,
            procedimiento="Rociar desinfectante y dejar actuar 5 minutos.",
        ),
    )