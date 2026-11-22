from contextlib import closing
import sqlite3

import pytest

from scripts.migrate_estado_lote import migrar


def crear_base_anterior(ruta):
    with closing(sqlite3.connect(ruta)) as db:
        db.execute("CREATE TABLE personal (id INTEGER PRIMARY KEY)")
        db.execute(
            "CREATE TABLE lotes_produccion "
            "(id INTEGER PRIMARY KEY, codigo VARCHAR(30), estado VARCHAR(20) NOT NULL, activo BOOLEAN NOT NULL)"
        )
        db.execute(
            "CREATE TABLE pasos_lote (id INTEGER PRIMARY KEY, lote_id INTEGER, orden INTEGER, estado VARCHAR(9) NOT NULL)"
        )
        db.executemany(
            "INSERT INTO lotes_produccion (id, codigo, estado, activo) VALUES (?, ?, ?, 1)",
            [(1, "SIN-PASOS", "abierto"), (2, "A-MEDIAS", "abierto"), (3, "COMPLETO", "abierto"), (4, "CERRADO", "cerrado")],
        )
        db.executemany(
            "INSERT INTO pasos_lote (lote_id, orden, estado) VALUES (?, ?, ?)",
            [(2, 1, "REALIZADO"), (2, 2, "PENDIENTE"), (3, 1, "REALIZADO"), (3, 2, "REALIZADO"), (4, 1, "PENDIENTE")],
        )
        db.commit()


def estados(ruta):
    with closing(sqlite3.connect(ruta)) as db:
        return dict(db.execute("SELECT codigo, estado FROM lotes_produccion"))


def columnas(ruta):
    with closing(sqlite3.connect(ruta)) as db:
        return {fila[1] for fila in db.execute('PRAGMA table_info("lotes_produccion")')}


def test_migracion_agrega_columnas_y_recalcula_estados_con_respaldo(tmp_path):
    ruta = tmp_path / "anterior.db"
    crear_base_anterior(ruta)

    respaldo = migrar(ruta)

    assert respaldo.is_file()
    assert {"fecha_anulacion", "anulado_por_id", "motivo_anulacion"} <= columnas(ruta)
    assert estados(ruta) == {
        "SIN-PASOS": "abierto",
        "A-MEDIAS": "en_produccion",
        "COMPLETO": "finalizado",
        "CERRADO": "cerrado",
    }
    assert estados(respaldo)["COMPLETO"] == "abierto"


def test_repetir_la_migracion_no_hace_cambios(tmp_path):
    ruta = tmp_path / "anterior.db"
    crear_base_anterior(ruta)
    migrar(ruta)

    assert migrar(ruta) is None


def test_la_migracion_rechaza_una_base_sin_lotes(tmp_path):
    ruta = tmp_path / "vacia.db"
    sqlite3.connect(ruta).close()

    with pytest.raises(ValueError):
        migrar(ruta)
