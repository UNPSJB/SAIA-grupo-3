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
from src.consumoQuimico import exceptions
from src.consumoQuimico.services import eliminar_consumo, modificar_consumo, obtener_consumo_acumulado
from tests.consumoQuimico.utilidades import HACE_5_DIAS, HACE_10_DIAS, HOY, MANANA, registrar, stock

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

def test_consumo_umbral_no_duplica_y_reposicion_reactiva(db_session, unidad_medida):
    q = crear_quimico(db_session, unidad_medida)
    assert cantidad_avisos(db_session) == 0
    c = usar(db_session, q)
    aviso = db_session.scalar(select(Notificacion))
    assert q.cantidad == 5 and aviso and (not aviso.resuelta)
    aviso.leida = True
    db_session.commit()
    usar(db_session, q, 1)
    assert cantidad_avisos(db_session) == 1 and aviso.leida
    quimicos.modificar_insumo_quimico(db_session, q.id, InsumoQuimicoUpdate(cantidad=11))
    assert aviso.resuelta and aviso.leida
    usar(db_session, q, 6)
    assert cantidad_avisos(db_session) == 1 and (not aviso.resuelta) and (not aviso.leida)
    consumos.eliminar_consumo(db_session, c.id)
    assert aviso.resuelta

def test_modificar_consumo_revisa_ambos_quimicos(db_session, unidad_medida):
    a = crear_quimico(db_session, unidad_medida)
    b = crear_quimico(db_session, unidad_medida, nombre='Otro')
    c = usar(db_session, a)
    consumos.modificar_consumo(db_session, c.id, ConsumoQuimicoUpdate(insumo_quimico_id=b.id))
    assert a.cantidad == 10 and b.cantidad == 5
    assert db_session.scalar(select(Notificacion).where(Notificacion.clave == f'stock-bajo-quimico-{a.id}')).resuelta
    assert not db_session.scalar(select(Notificacion).where(Notificacion.clave == f'stock-bajo-quimico-{b.id}')).resuelta
    consumos.eliminar_consumo(db_session, c.id)
    assert b.cantidad == 10
    consumos.modificar_consumo(db_session, c.id, ConsumoQuimicoUpdate(activo=True))
    assert b.cantidad == 5
    assert not db_session.scalar(select(Notificacion).where(Notificacion.clave == f'stock-bajo-quimico-{b.id}')).resuelta

def test_fallo_aviso_revierte_consumo(db_session, unidad_medida, monkeypatch):
    q = crear_quimico(db_session, unidad_medida)

    def fallo(*args, **kwargs):
        raise RuntimeError('fallo aviso')
    monkeypatch.setattr(avisos, 'revisar_stock_insumo', fallo)
    with pytest.raises(RuntimeError):
        usar(db_session, q)
    assert db_session.get(InsumoQuimico, q.id).cantidad == 10
    assert db_session.scalar(select(func.count()).select_from(ConsumoQuimico)) == 0
    assert cantidad_avisos(db_session) == 0

def test_reactivar_consumo_con_otro_quimico_y_cantidad(db_session, unidad_medida):
    a = crear_quimico(db_session, unidad_medida)
    b = crear_quimico(db_session, unidad_medida, nombre='Otro')
    c = usar(db_session, a)
    consumos.eliminar_consumo(db_session, c.id)
    consumos.modificar_consumo(db_session, c.id, ConsumoQuimicoUpdate(activo=True, insumo_quimico_id=b.id, cantidad_utilizada=6))
    assert a.cantidad == 10 and b.cantidad == 4
    consumos.modificar_consumo(db_session, c.id, ConsumoQuimicoUpdate(activo=False))
    assert b.cantidad == 10


def test_registrar_un_consumo_descuenta_el_stock(db_session, detergente):
    consumo = registrar(db_session, detergente, 4)

    assert consumo.id is not None
    assert consumo.activo is True
    assert stock(db_session, detergente) == 6


def test_registrar_un_consumo_de_todo_el_stock_lo_deja_en_cero(db_session, detergente):
    registrar(db_session, detergente, 10)

    assert stock(db_session, detergente) == 0


def test_stock_insuficiente_lanza_error_y_no_descuenta(db_session, detergente):
    with pytest.raises(exceptions.StockInsuficiente):
        registrar(db_session, detergente, 11)

    assert stock(db_session, detergente) == 10


@pytest.mark.parametrize("nueva_cantidad, stock_esperado", [(7, 3), (1, 9), (10, 0)])
def test_modificar_la_cantidad_ajusta_la_diferencia_en_el_stock(db_session, detergente, nueva_cantidad, stock_esperado):
    consumo = registrar(db_session, detergente, 4)

    modificar_consumo(db_session, consumo.id, ConsumoQuimicoUpdate(cantidad_utilizada=nueva_cantidad))

    assert stock(db_session, detergente) == stock_esperado


def test_modificar_la_cantidad_sin_stock_suficiente_no_cambia_nada(db_session, detergente):
    consumo = registrar(db_session, detergente, 4)

    with pytest.raises(exceptions.StockInsuficiente):
        modificar_consumo(db_session, consumo.id, ConsumoQuimicoUpdate(cantidad_utilizada=11))

    assert stock(db_session, detergente) == 6


def test_cambiar_de_insumo_devuelve_el_stock_al_anterior_y_descuenta_del_nuevo(db_session, detergente, desinfectante):
    consumo = registrar(db_session, detergente, 4)

    modificar_consumo(db_session, consumo.id, ConsumoQuimicoUpdate(insumo_quimico_id=desinfectante.id))

    assert stock(db_session, detergente) == 10
    assert stock(db_session, desinfectante) == 16


def test_cambiar_de_insumo_y_cantidad_a_la_vez(db_session, detergente, desinfectante):
    consumo = registrar(db_session, detergente, 4)

    modificar_consumo(
        db_session, consumo.id, ConsumoQuimicoUpdate(insumo_quimico_id=desinfectante.id, cantidad_utilizada=15)
    )

    assert stock(db_session, detergente) == 10
    assert stock(db_session, desinfectante) == 5


def test_cambiar_a_un_insumo_sin_stock_suficiente_no_cambia_nada(db_session, detergente, desinfectante):
    consumo = registrar(db_session, detergente, 4)

    with pytest.raises(exceptions.StockInsuficiente):
        modificar_consumo(
            db_session, consumo.id, ConsumoQuimicoUpdate(insumo_quimico_id=desinfectante.id, cantidad_utilizada=21)
        )

    assert stock(db_session, detergente) == 6
    assert stock(db_session, desinfectante) == 20


def test_dar_de_baja_un_consumo_devuelve_el_stock(db_session, detergente):
    consumo = registrar(db_session, detergente, 4)

    eliminado = eliminar_consumo(db_session, consumo.id)

    assert eliminado.activo is False
    assert stock(db_session, detergente) == 10


def test_dar_de_baja_dos_veces_no_devuelve_el_stock_dos_veces(db_session, detergente):
    consumo = registrar(db_session, detergente, 4)
    eliminar_consumo(db_session, consumo.id)

    with pytest.raises(exceptions.ConsumoNoEncontrado):
        eliminar_consumo(db_session, consumo.id)

    assert stock(db_session, detergente) == 10


def test_reactivar_un_consumo_vuelve_a_descontar_el_stock(db_session, detergente):
    consumo = registrar(db_session, detergente, 4)
    eliminar_consumo(db_session, consumo.id)

    reactivado = modificar_consumo(db_session, consumo.id, ConsumoQuimicoUpdate(activo=True))

    assert reactivado.activo is True
    assert stock(db_session, detergente) == 6


def test_reactivar_sin_stock_suficiente_lanza_error(db_session, detergente):
    consumo = registrar(db_session, detergente, 4)
    eliminar_consumo(db_session, consumo.id)
    registrar(db_session, detergente, 8)

    with pytest.raises(exceptions.StockInsuficiente):
        modificar_consumo(db_session, consumo.id, ConsumoQuimicoUpdate(activo=True))

    assert stock(db_session, detergente) == 2


@pytest.fixture
def consumos_del_mes(db_session, detergente, desinfectante):
    registrar(db_session, detergente, 1, fecha=HACE_10_DIAS)
    registrar(db_session, detergente, 2, fecha=HACE_5_DIAS)
    registrar(db_session, detergente, 3, fecha=HOY)
    registrar(db_session, desinfectante, 5, fecha=HACE_5_DIAS)
    dado_de_baja = registrar(db_session, desinfectante, 7, fecha=HOY)
    eliminar_consumo(db_session, dado_de_baja.id)


def totales(reporte):
    return {fila["nombre_insumo"]: fila["cantidad_total"] for fila in reporte}


def test_reporte_acumulado_suma_por_insumo(db_session, consumos_del_mes):
    reporte = obtener_consumo_acumulado(db_session)

    assert totales(reporte) == {"Desinfectante": 5, "Detergente": 6}
    assert [fila["nombre_insumo"] for fila in reporte] == ["Desinfectante", "Detergente"]
    assert all(fila["unidad_medida"] == "kg" for fila in reporte)


@pytest.mark.parametrize(
    "fecha_desde, fecha_hasta, esperado",
    [
        (HACE_5_DIAS, None, {"Desinfectante": 5, "Detergente": 5}),
        (None, HACE_5_DIAS, {"Desinfectante": 5, "Detergente": 3}),
        (HACE_5_DIAS, HACE_5_DIAS, {"Desinfectante": 5, "Detergente": 2}),
        (HOY, HOY, {"Detergente": 3}),
    ],
)
def test_reporte_acumulado_filtra_por_fechas(db_session, consumos_del_mes, fecha_desde, fecha_hasta, esperado):
    reporte = obtener_consumo_acumulado(db_session, fecha_desde=fecha_desde, fecha_hasta=fecha_hasta)

    assert totales(reporte) == esperado


def test_reporte_acumulado_sin_consumos_en_el_rango_esta_vacio(db_session, consumos_del_mes):
    reporte = obtener_consumo_acumulado(db_session, fecha_desde=MANANA)

    assert reporte == []
