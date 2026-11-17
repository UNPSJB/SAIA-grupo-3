import pytest

from src.loteProduccion.models import LoteProduccion
from tests.nutricion.conftest import (
    ingredientes,
    nuevo_producto,
    receta_referencia,
    receta_referencia_incompleta,
    unidades,
)

__all__ = ["ingredientes", "nuevo_producto", "receta_referencia", "receta_referencia_incompleta", "unidades"]


@pytest.fixture
def producto_id(receta_referencia):
    return receta_referencia["producto"]["id"]


@pytest.fixture
def nuevo_lote(db_session, persona_administradora):
    def crear(producto_id, codigo, fecha):
        lote = LoteProduccion(
            codigo=codigo,
            producto_id=producto_id,
            fecha_produccion=fecha,
            cantidad=10,
            registrado_por_id=persona_administradora.id,
        )
        db_session.add(lote)
        db_session.commit()
        return lote

    return crear
