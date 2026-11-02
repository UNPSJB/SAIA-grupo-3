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
