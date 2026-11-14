import pytest

from src.insumos.constants import TipoInsumo
from src.insumos.models import Insumo
from src.nutricion.models import AlimentoReferencia


@pytest.fixture
def harina_referencia(db_session):
    alimento = AlimentoReferencia(
        fuente="DEMO",
        codigo="DEMO-001",
        nombre="Harina de trigo 000",
        energia_kcal=340,
        carbohidratos_g=72,
        azucares_totales_g=0.3,
        proteinas_g=10,
        grasas_totales_g=1,
        grasas_saturadas_g=0.2,
        grasas_trans_g=0,
        fibra_g=2.7,
        sodio_mg=2,
    )
    db_session.add(alimento)
    db_session.commit()
    return alimento


@pytest.fixture
def aditivo(db_session, unidad_medida):
    insumo = Insumo(nombre="Bicarbonato", unidad_medida_id=unidad_medida.id, tipo=TipoInsumo.ADITIVO, activo=True)
    db_session.add(insumo)
    db_session.commit()
    return insumo
