import pytest

from tests.consumoQuimico.utilidades import crear_quimico


@pytest.fixture
def detergente(db_session, unidad_medida):
    return crear_quimico(db_session, unidad_medida, "Detergente", 10)


@pytest.fixture
def desinfectante(db_session, unidad_medida):
    return crear_quimico(db_session, unidad_medida, "Desinfectante", 20)
