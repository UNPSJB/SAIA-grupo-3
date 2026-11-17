import pytest
from sqlalchemy import select

from scripts.datos_iniciales_alergenos import cargar_alergenos_iniciales
from src.alergeno.models import Alergeno


@pytest.fixture
def alergenos_caa(db_session):
    cargar_alergenos_iniciales(db_session)
    db_session.commit()
    return {a.nombre: a for a in db_session.scalars(select(Alergeno))}
