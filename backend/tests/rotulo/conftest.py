import pytest

from src.loteProduccion.models import LoteProduccion
from tests.alergeno.conftest import alergenos_caa
from tests.nutricion.conftest import (
    ingredientes,
    nuevo_producto,
    receta_referencia,
    receta_referencia_incompleta,
    unidades,
)

__all__ = ["alergenos_caa", "ingredientes", "nuevo_producto", "receta_referencia", "receta_referencia_incompleta", "unidades"]


@pytest.fixture
def producto_id(receta_referencia):
    return receta_referencia["producto"]["id"]


@pytest.fixture
def nuevo_lote(db_session, persona_administradora):
    def crear(producto_id, codigo, fecha, codigo_barras=None):
        lote = LoteProduccion(
            codigo=codigo,
            codigo_barras=codigo_barras,
            producto_id=producto_id,
            fecha_produccion=fecha,
            cantidad=10,
            registrado_por_id=persona_administradora.id,
        )
        db_session.add(lote)
        db_session.commit()
        return lote

    return crear
