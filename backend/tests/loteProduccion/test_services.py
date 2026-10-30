from datetime import date

import pytest
from sqlalchemy import func, select

from src.loteProduccion import exceptions, schemas, services
from src.loteProduccion.models import LoteInsumo, LoteProduccion
from tests.database import (
    db_session,
    insumo_activo,
    insumo_inactivo,
    otro_insumo_activo,
    persona_operadora,
    producto,
    unidad_medida,
)


def test_crear_lote_asocia_insumos_y_no_modifica_stock(
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
            schemas.LoteInsumoCreate(insumo_id=insumo_activo.id, cantidad_usada=2.5),
            schemas.LoteInsumoCreate(insumo_id=otro_insumo_activo.id, cantidad_usada=1.25),
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
    assert insumo_activo.cantidad == 50
    assert otro_insumo_activo.cantidad == 20


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
    assert db_session.scalar(select(func.count()).select_from(LoteProduccion)) == 0


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
    assert db_session.scalar(select(func.count()).select_from(LoteProduccion)) == 0


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
    assert db_session.scalar(select(func.count()).select_from(LoteProduccion)) == 0


def test_crear_lote_revierte_lote_y_asociaciones_si_falla_commit(
    db_session,
    monkeypatch,
    persona_operadora,
    producto,
    insumo_activo,
):
    lote_a_crear = schemas.LoteProduccionCreate(
        producto_id=producto.id,
        fecha_produccion=date.today(),
        cantidad=12.5,
        insumos=[schemas.LoteInsumoCreate(insumo_id=insumo_activo.id, cantidad_usada=1)],
    )

    def fallar_commit():
        raise RuntimeError("Fallo de persistencia simulado.")

    monkeypatch.setattr(db_session, "commit", fallar_commit)

    # Act
    with pytest.raises(RuntimeError, match="Fallo de persistencia simulado"):
        services.crear_lote(db_session, lote_a_crear, persona_operadora.id)

    # Assert
    assert db_session.scalar(select(func.count()).select_from(LoteProduccion)) == 0
    assert db_session.scalar(select(func.count()).select_from(LoteInsumo)) == 0


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
