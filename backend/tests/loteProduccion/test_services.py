from datetime import date

import pytest
from fastapi import HTTPException
from sqlalchemy import select

from src.abastecimiento import services as abastecimiento_services
from src.loteProduccion import exceptions, schemas, services
from src.loteProduccion.models import LoteInsumo, LoteProduccion
from tests.abastecimiento.stock_trazable import identificar_stock
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


def test_lote_cerrado_no_admite_edicion(db_session, producto, persona_operadora):
    from datetime import date
    from fastapi import HTTPException
    from src.loteProduccion.constants import EstadoLote
    lote=services.crear_lote(db_session,schemas.LoteProduccionCreate(producto_id=producto.id,fecha_produccion=date.today(),cantidad=10),persona_operadora.id)
    cerrado=services.cerrar_lote(db_session,lote.id,persona_operadora.id)
    assert cerrado.estado==EstadoLote.CERRADO and cerrado.cerrado_por_id==persona_operadora.id
    assert cerrado.fecha_cierre is not None
    with pytest.raises(HTTPException):services.modificar_lote(db_session,lote.id,schemas.LoteProduccionUpdate(cantidad=20))
    assert services.leer_lote(db_session,lote.id).cantidad==10


"""Aceptación de stock mínimo; toda la persistencia se hace en SQLite aislado."""
from datetime import date
import sqlite3
from pathlib import Path
import pytest
from pydantic import ValidationError
from sqlalchemy import select, func
from tests.database import db_session, unidad_medida, insumo_activo, producto, persona_operadora
from src.insumos.models import Insumo
from src.insumos.schemas import InsumoCreate, InsumoUpdate
from src.insumos import services as ingredientes
from src.insumosQuimicos.models import InsumoQuimico, TipoQuimico
from src.insumosQuimicos.schemas import InsumoQuimicoCreate, InsumoQuimicoUpdate
from src.insumosQuimicos import services as quimicos
from src.notificaciones.models import Notificacion
from src.notificaciones import services as avisos
from src.consumoQuimico import services as consumos
from src.consumoQuimico.schemas import ConsumoQuimicoCreate, ConsumoQuimicoUpdate
from src.consumoQuimico.models import ConsumoQuimico
from scripts.migrate_stock_minimo import migrar

def crear_quimico(db, unidad, nombre='Detergente', cantidad=10, minimo=5):
    return quimicos.crear_insumo_quimico(db, InsumoQuimicoCreate(nombre=nombre, cantidad=cantidad, stock_minimo=minimo, tipo_quimico=TipoQuimico.DETERGENTE, unidad_medida_id=unidad.id))

def recibir_prueba(db, insumo, actor, cantidad):
    if not cantidad:
        return
    from datetime import timedelta
    from uuid import uuid4
    from src.abastecimiento.models import Proveedor, LoteRecepcionInsumo
    proveedor = Proveedor(nombre='Proveedor ficticio', cuit=str(uuid4()), activo=True)
    db.add(proveedor)
    db.flush()
    db.add(LoteRecepcionInsumo(insumo_id=insumo.id, proveedor_id=proveedor.id, numero_lote='TEST', cantidad=cantidad, cantidad_disponible=cantidad, fecha_recepcion=date.today(), fecha_vencimiento=date.today() + timedelta(days=30), registrado_por_id=actor.id, clave_operacion=str(uuid4()), activo=True, conciliacion=False))
    db.commit()
    db.refresh(insumo)

def usar(db, q, cantidad=5):
    return consumos.crear_consumo(db, ConsumoQuimicoCreate(insumo_quimico_id=q.id, cantidad_utilizada=cantidad, fecha=date.today(), tarea_limpieza='Limpieza demo'))

def cantidad_avisos(db):
    return db.scalar(select(func.count()).select_from(Notificacion))

@pytest.mark.parametrize('fallar', [False, True])
def test_produccion_origen_y_aviso_atomicos(db_session, insumo_activo, producto, persona_operadora, monkeypatch, fallar):
    from tests.abastecimiento.stock_trazable import identificar_stock
    from src.loteProduccion.services import crear_lote
    from src.loteProduccion.schemas import LoteProduccionCreate, LoteInsumoCreate
    from src.loteProduccion.models import LoteProduccion
    from src.abastecimiento.models import LoteRecepcionInsumo, ConsumoLoteRecepcion
    lotes = identificar_stock(db_session, persona_operadora, insumo_activo)
    ingredientes.modificar_insumo(db_session, insumo_activo.id, InsumoUpdate(stock_minimo=45))

    def fallo(*args, **kwargs):
        raise RuntimeError('fallo aviso')
    if fallar:
        monkeypatch.setattr(avisos, 'revisar_stock_insumo', fallo)

    def ejecutar():
        crear_lote(db_session, LoteProduccionCreate(producto_id=producto.id, fecha_produccion=date.today(), cantidad=1, insumos=[LoteInsumoCreate(insumo_id=insumo_activo.id, cantidad_usada=5, lotes_recepcion=[dict(lote_recepcion_id=lotes[insumo_activo.id], cantidad=5)])]), persona_operadora.id)
    if fallar:
        with pytest.raises(RuntimeError):
            ejecutar()
        assert insumo_activo.cantidad == 50
        assert db_session.scalar(select(LoteRecepcionInsumo)).cantidad_disponible == 50
        assert db_session.scalar(select(func.count()).select_from(LoteProduccion)) == 0
        assert db_session.scalar(select(func.count()).select_from(ConsumoLoteRecepcion)) == 0
        assert cantidad_avisos(db_session) == 0
    else:
        ejecutar()
        assert insumo_activo.cantidad == 45 and cantidad_avisos(db_session) == 1
