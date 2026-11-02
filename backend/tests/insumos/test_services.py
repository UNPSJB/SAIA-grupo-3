import pytest
from pydantic import ValidationError

from src.insumos import schemas, services
from src.insumos.models import Insumo
from tests.database import (
    db_session,
    insumo_activo,
    lote_recepcion,
    persona_administradora,
    proveedor_activo,
    unidad_medida,
)


def test_crear_insumo_sin_stock_inicial(db_session, unidad_medida):
    creado = services.crear_insumo(
        db_session,
        schemas.InsumoCreate(
            nombre="Harina",
            unidad_medida_id=unidad_medida.id,
        ),
    )

    assert creado.cantidad == 0
    assert "cantidad" not in Insumo.__table__.columns


@pytest.mark.parametrize(
    "datos",
    [
        {"nombre": "Harina", "unidad_medida_id": 1, "cantidad": 50},
        {"nombre": "Harina", "unidad_medida_id": 1, "cantidad": 0},
    ],
)
def test_schema_catalogo_no_acepta_cantidad(datos):
    with pytest.raises(ValidationError):
        schemas.InsumoCreate(**datos)


def test_schema_actualizacion_catalogo_no_acepta_cantidad():
    with pytest.raises(ValidationError):
        schemas.InsumoUpdate(cantidad=50)


def test_cantidad_de_lectura_se_calcula_desde_recepciones(
    db_session,
    insumo_activo,
    lote_recepcion,
):
    db_session.refresh(insumo_activo)

    assert insumo_activo.cantidad == lote_recepcion.cantidad_disponible
