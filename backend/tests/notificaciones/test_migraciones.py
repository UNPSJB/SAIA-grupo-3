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

def test_migracion_repetible_con_respaldo_y_datos(tmp_path):
    path = tmp_path / 'anterior.db'
    with sqlite3.connect(path) as db:
        db.executescript('CREATE TABLE insumos (id INTEGER, cantidad FLOAT); CREATE TABLE insumos_quimicos (id INTEGER); CREATE TABLE notificaciones (id INTEGER, leida BOOLEAN); INSERT INTO insumos VALUES (1, 12); INSERT INTO notificaciones VALUES (1, 1);')
    backup = migrar(path)
    assert backup.is_file() and migrar(path) is None
    with sqlite3.connect(path) as db:
        assert db.execute('SELECT cantidad, stock_minimo FROM insumos').fetchone() == (12, None)
        assert db.execute('SELECT leida, resuelta FROM notificaciones').fetchone() == (1, 0)
    with sqlite3.connect(backup) as db:
        assert 'stock_minimo' not in {r[1] for r in db.execute('PRAGMA table_info(insumos)')}

def test_migracion_conserva_stock_historico_y_permite_nuevos_insumos(tmp_path):
    path = tmp_path / 'legacy.db'
    with sqlite3.connect(path) as db:
        db.executescript("\n            CREATE TABLE insumos (\n                id INTEGER PRIMARY KEY,\n                nombre TEXT NOT NULL,\n                cantidad FLOAT NOT NULL,\n                unidad_medida_id INTEGER,\n                activo BOOLEAN DEFAULT 1\n            );\n            CREATE INDEX ix_insumos_nombre ON insumos(nombre);\n            CREATE TABLE insumos_quimicos (id INTEGER);\n            CREATE TABLE notificaciones (id INTEGER, leida BOOLEAN);\n            CREATE TABLE lotes (id INTEGER PRIMARY KEY, insumo_id INTEGER REFERENCES insumos(id));\n            INSERT INTO insumos VALUES (1, 'Harina anterior', 37, 1, 1);\n            INSERT INTO lotes VALUES (1, 1);\n        ")
    backup = migrar(path)
    assert backup and backup.is_file()
    assert migrar(path) is None
    with sqlite3.connect(path) as db:
        assert db.execute('SELECT cantidad FROM insumos WHERE id=1').fetchone() == (37,)
        assert not db.execute('PRAGMA foreign_key_check').fetchall()
        assert db.execute("SELECT 1 FROM sqlite_master WHERE name='ix_insumos_nombre'").fetchone()
        db.execute("INSERT INTO insumos(nombre, unidad_medida_id) VALUES ('Harina nueva', 1)")
        assert db.execute("SELECT cantidad FROM insumos WHERE nombre='Harina nueva'").fetchone() == (0,)
        assert db.execute('SELECT insumo_id FROM lotes').fetchone() == (1,)
    with sqlite3.connect(backup) as db:
        assert db.execute('SELECT cantidad FROM insumos').fetchone() == (37,)
