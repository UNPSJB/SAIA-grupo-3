from datetime import date

from sqlalchemy import select

from src.loteProduccion.models import LoteInsumo, LoteProduccion
import seed
from tests.database import (
    db_session,
    insumo_activo,
    persona_operadora,
    producto,
    unidad_medida,
)


def test_asociar_ingredientes_demo_no_descuenta_stock_al_repetir(
    db_session,
    monkeypatch,
    insumo_activo,
    persona_operadora,
    producto,
    unidad_medida,
):
    monkeypatch.setattr(
        seed,
        "RECETAS_LOTES_DEMO",
        {"Pan francés": [("Harina de trigo", 10.0)]},
    )
    producto.nombre = "Pan francés"
    insumo_activo.nombre = "Harina de trigo"
    db_session.commit()
    lote = LoteProduccion(
        codigo="L-SEED-TEST-001",
        producto_id=producto.id,
        fecha_produccion=date.today(),
        cantidad=15,
        registrado_por_id=persona_operadora.id,
        activo=True,
    )
    db_session.add(lote)
    db_session.commit()
    db_session.refresh(lote)
    ingredientes = {"Harina de trigo": insumo_activo}

    # Act
    seed.asociar_ingredientes_demo(db_session, lote, ingredientes)
    db_session.flush()
    seed.asociar_ingredientes_demo(db_session, lote, ingredientes)

    # Assert
    asociaciones = db_session.scalars(
        select(LoteInsumo).where(LoteInsumo.lote_id == lote.id)
    ).all()
    db_session.refresh(insumo_activo)
    assert len(asociaciones) == 1
    assert insumo_activo.cantidad == 40
