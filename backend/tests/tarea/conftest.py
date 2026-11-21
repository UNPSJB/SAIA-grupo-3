import pytest

from src.elementos.models import Elemento
from src.equipos.models import Equipo, TipoEquipo
from src.insumosQuimicos.models import InsumoQuimico, TipoQuimico
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
def elemento_esponja(db_session):
    return guardar(db_session, Elemento(nombre="Esponja", frecuencia_recambio=15, activo=True))


@pytest.fixture
def elemento_cepillo(db_session):
    return guardar(db_session, Elemento(nombre="Cepillo", frecuencia_recambio=30, activo=True))


@pytest.fixture
def quimico_detergente(db_session, unidad_medida):
    return guardar(
        db_session,
        InsumoQuimico(
            nombre="Detergente neutro",
            cantidad=20.0,
            tipo_quimico=TipoQuimico.DETERGENTE,
            unidad_medida_id=unidad_medida.id,
            activo=True,
        ),
    )


@pytest.fixture
def quimico_desinfectante(db_session, unidad_medida):
    return guardar(
        db_session,
        InsumoQuimico(
            nombre="Desinfectante clorado",
            cantidad=15.0,
            tipo_quimico=TipoQuimico.DESINFECTANTE,
            unidad_medida_id=unidad_medida.id,
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