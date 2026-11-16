import pytest

from scripts.datos_iniciales_rotulado_frontal import cargar_parametros_iniciales


@pytest.fixture
def parametros(db_session):
    conjunto = cargar_parametros_iniciales(db_session)
    db_session.commit()
    return conjunto.id
