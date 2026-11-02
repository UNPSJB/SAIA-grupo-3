from datetime import date

import pytest
from fastapi import HTTPException
from sqlalchemy import select

from src.abastecimiento import services as abastecimiento_services
from src.loteProduccion import exceptions, schemas, services
from src.loteProduccion.models import LoteInsumo, LoteProduccion
from tests.stock_trazable import identificar_stock
from tests.database import (
    db_session,
    insumo_activo,
    insumo_inactivo,
    lote_recepcion,
    otro_insumo_activo,
    persona_administradora,
    persona_operadora,
    producto,
    proveedor_activo,
    unidad_medida,
)


def test_crear_lote_asocia_insumos_y_descuenta_stock(
    db_session,
    persona_operadora,
    producto,
    insumo_activo,
    otro_insumo_activo,
):
    lotes = identificar_stock(db_session, persona_operadora, insumo_activo, otro_insumo_activo)
    lote_a_crear = schemas.LoteProduccionCreate(
        producto_id=producto.id,
        fecha_produccion=date.today(),
        cantidad=12.5,
        insumos=[
            schemas.LoteInsumoCreate(
                insumo_id=insumo_activo.id,
                cantidad_usada=2.5,
                lotes_recepcion=[
                    schemas.ConsumoRecepcionCreate(
                        lote_recepcion_id=lotes[insumo_activo.id],
                        cantidad=2.5,
                    )
                ],
            ),
            schemas.LoteInsumoCreate(
                insumo_id=otro_insumo_activo.id,
                cantidad_usada=1.25,
                lotes_recepcion=[
                    schemas.ConsumoRecepcionCreate(
                        lote_recepcion_id=lotes[otro_insumo_activo.id],
                        cantidad=1.25,
                    )
                ],
            ),
        ],
    )

    # Act
    lote_creado = services.crear_lote(db_session, lote_a_crear, persona_operadora.id)

    # Assert
    assert len(lote_creado.insumos_asociados) == 2
    assert {asociacion.insumo_id: asociacion.cantidad_usada for asociacion in lote_creado.insumos_asociados} == {
        insumo_activo.id: 2.5,
        otro_insumo_activo.id: 1.25,
    }
    db_session.refresh(insumo_activo)
    db_session.refresh(otro_insumo_activo)
    assert insumo_activo.cantidad == 47.5
    assert otro_insumo_activo.cantidad == 48.75


def test_crear_lote_permite_agotar_exactamente_el_stock(
    db_session,
    persona_operadora,
    producto,
    insumo_activo,
):
    lotes = identificar_stock(db_session, persona_operadora, insumo_activo)
    lote_a_crear = schemas.LoteProduccionCreate(
        producto_id=producto.id,
        fecha_produccion=date.today(),
        cantidad=12.5,
        insumos=[
            schemas.LoteInsumoCreate(
                insumo_id=insumo_activo.id,
                cantidad_usada=50,
                lotes_recepcion=[
                    schemas.ConsumoRecepcionCreate(
                        lote_recepcion_id=lotes[insumo_activo.id],
                        cantidad=50,
                    )
                ],
            )
        ],
    )

    # Act
    services.crear_lote(db_session, lote_a_crear, persona_operadora.id)

    # Assert
    db_session.refresh(insumo_activo)
    assert insumo_activo.cantidad == 0


def test_crear_lote_rechaza_stock_insuficiente_sin_cambios_parciales(
    db_session,
    persona_operadora,
    producto,
    insumo_activo,
    otro_insumo_activo,
):
    lote_a_crear = schemas.LoteProduccionCreate(
        producto_id=producto.id,
        fecha_produccion=date.today(),
        cantidad=12.5,
        insumos=[
            schemas.LoteInsumoCreate(insumo_id=insumo_activo.id, cantidad_usada=5),
            schemas.LoteInsumoCreate(insumo_id=otro_insumo_activo.id, cantidad_usada=21),
        ],
    )

    # Act
    with pytest.raises(exceptions.StockInsuficiente):
        services.crear_lote(db_session, lote_a_crear, persona_operadora.id)

    # Assert
    assert db_session.scalars(select(LoteProduccion)).all() == []
    assert db_session.scalars(select(LoteInsumo)).all() == []
    db_session.refresh(insumo_activo)
    db_session.refresh(otro_insumo_activo)
    assert insumo_activo.cantidad == 0
    assert otro_insumo_activo.cantidad == 0


def test_crear_lote_sin_insumos(db_session, persona_operadora, producto):
    lote_a_crear = schemas.LoteProduccionCreate(
        producto_id=producto.id,
        fecha_produccion=date.today(),
        cantidad=12.5,
    )

    # Act
    lote_creado = services.crear_lote(db_session, lote_a_crear, persona_operadora.id)

    # Assert
    assert lote_creado.insumos_asociados == []


def test_crear_lote_rechaza_insumo_inexistente(
    db_session,
    persona_operadora,
    producto,
):
    lote_a_crear = schemas.LoteProduccionCreate(
        producto_id=producto.id,
        fecha_produccion=date.today(),
        cantidad=12.5,
        insumos=[schemas.LoteInsumoCreate(insumo_id=999, cantidad_usada=1)],
    )

    # Act
    with pytest.raises(exceptions.InsumoNoEncontrado):
        services.crear_lote(db_session, lote_a_crear, persona_operadora.id)

    # Assert
    assert db_session.scalars(select(LoteProduccion)).all() == []


def test_crear_lote_rechaza_insumo_inactivo(
    db_session,
    persona_operadora,
    producto,
    insumo_inactivo,
):
    lote_a_crear = schemas.LoteProduccionCreate(
        producto_id=producto.id,
        fecha_produccion=date.today(),
        cantidad=12.5,
        insumos=[
            schemas.LoteInsumoCreate(insumo_id=insumo_inactivo.id, cantidad_usada=1),
        ],
    )

    # Act
    with pytest.raises(exceptions.InsumoInactivo):
        services.crear_lote(db_session, lote_a_crear, persona_operadora.id)

    # Assert
    assert db_session.scalars(select(LoteProduccion)).all() == []


def test_crear_lote_rechaza_insumos_duplicados(
    db_session,
    persona_operadora,
    producto,
    insumo_activo,
):
    lote_a_crear = schemas.LoteProduccionCreate(
        producto_id=producto.id,
        fecha_produccion=date.today(),
        cantidad=12.5,
        insumos=[
            schemas.LoteInsumoCreate(insumo_id=insumo_activo.id, cantidad_usada=1),
            schemas.LoteInsumoCreate(insumo_id=insumo_activo.id, cantidad_usada=2),
        ],
    )

    # Act
    with pytest.raises(exceptions.InsumoDuplicado):
        services.crear_lote(db_session, lote_a_crear, persona_operadora.id)

    # Assert
    assert db_session.scalars(select(LoteProduccion)).all() == []


def test_crear_lote_revierte_lote_y_asociaciones_si_falla_commit(
    db_session,
    monkeypatch,
    persona_operadora,
    producto,
    insumo_activo,
):
    lotes = identificar_stock(db_session, persona_operadora, insumo_activo)
    lote_a_crear = schemas.LoteProduccionCreate(
        producto_id=producto.id,
        fecha_produccion=date.today(),
        cantidad=12.5,
        insumos=[
            schemas.LoteInsumoCreate(
                insumo_id=insumo_activo.id,
                cantidad_usada=1,
                lotes_recepcion=[
                    schemas.ConsumoRecepcionCreate(
                        lote_recepcion_id=lotes[insumo_activo.id],
                        cantidad=1,
                    )
                ],
            )
        ],
    )

    def fallar_commit():
        raise RuntimeError("Fallo de persistencia simulado.")

    monkeypatch.setattr(db_session, "commit", fallar_commit)

    # Act
    with pytest.raises(RuntimeError, match="Fallo de persistencia simulado"):
        services.crear_lote(db_session, lote_a_crear, persona_operadora.id)

    # Assert
    assert db_session.scalars(select(LoteProduccion)).all() == []
    assert db_session.scalars(select(LoteInsumo)).all() == []
    db_session.refresh(insumo_activo)
    assert insumo_activo.cantidad == 50


def test_listar_insumos_disponibles_devuelve_solo_activos(
    db_session,
    insumo_activo,
    insumo_inactivo,
    otro_insumo_activo,
):
    # Act
    insumos = services.listar_insumos_disponibles(db_session)

    # Assert
    assert [insumo.id for insumo in insumos] == [
        otro_insumo_activo.id,
        insumo_activo.id,
    ]


def test_crear_lote_rechaza_consumo_sin_recepcion_trazable(
    db_session,
    persona_operadora,
    producto,
    insumo_activo,
    lote_recepcion,
):
    datos_lote = schemas.LoteProduccionCreate(
        producto_id=producto.id,
        fecha_produccion=date.today(),
        cantidad=8,
        insumos=[
            schemas.LoteInsumoCreate(
                insumo_id=insumo_activo.id,
                cantidad_usada=15,
            )
        ],
    )
    with pytest.raises(HTTPException) as error:
        services.crear_lote(db_session, datos_lote, persona_operadora.id)

    assert error.value.status_code == 400
    assert "no tienen stock suficiente" in error.value.detail
    assert db_session.scalar(select(LoteProduccion)) is None
    assert db_session.scalar(select(LoteInsumo)) is None


def test_crear_lote_exige_elegir_recepcion_aunque_haya_stock(
    db_session,
    persona_operadora,
    producto,
    insumo_activo,
    lote_recepcion,
):
    datos_lote = schemas.LoteProduccionCreate(
        producto_id=producto.id,
        fecha_produccion=date.today(),
        cantidad=8,
        insumos=[
            schemas.LoteInsumoCreate(
                insumo_id=insumo_activo.id,
                cantidad_usada=2,
            )
        ],
    )

    with pytest.raises(HTTPException) as error:
        services.crear_lote(db_session, datos_lote, persona_operadora.id)

    assert error.value.status_code == 409
    assert "Seleccioná al menos una recepción" in error.value.detail
    assert db_session.scalar(select(LoteProduccion)) is None
    assert db_session.scalar(select(LoteInsumo)) is None
    db_session.refresh(lote_recepcion)
    assert lote_recepcion.cantidad_disponible == 12


def test_trazabilidad_hacia_adelante_por_lote_de_recepcion(
    db_session,
    persona_operadora,
    producto,
    insumo_activo,
    lote_recepcion,
):
    datos_lote = schemas.LoteProduccionCreate(
        producto_id=producto.id,
        fecha_produccion=date.today(),
        cantidad=8,
        insumos=[
            schemas.LoteInsumoCreate(
                insumo_id=insumo_activo.id,
                cantidad_usada=2,
                lotes_recepcion=[
                    schemas.ConsumoRecepcionCreate(
                        lote_recepcion_id=lote_recepcion.id,
                        cantidad=2,
                    )
                ],
            )
        ],
    )
    lote = services.crear_lote(db_session, datos_lote, persona_operadora.id)

    # Act
    usos = abastecimiento_services.trazabilidad(db_session, lote_recepcion.id)

    # Assert
    assert len(usos) == 1
    assert usos[0]["lote_produccion_id"] == lote.id
    assert usos[0]["cantidad_utilizada"] == 2
