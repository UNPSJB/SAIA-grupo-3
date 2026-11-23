from contextlib import closing
import sqlite3

import pytest

migrar = pytest.importorskip("scripts.migrate_codigo_barras").migrar


def crear_base_anterior(ruta):
    with closing(sqlite3.connect(ruta)) as db:
        db.execute(
            "CREATE TABLE lotes_produccion "
            "(id INTEGER PRIMARY KEY, codigo VARCHAR(30), fecha_produccion DATE NOT NULL)"
        )
        db.executemany(
            "INSERT INTO lotes_produccion (id, codigo, fecha_produccion) VALUES (?, ?, ?)",
            [
                (1, "L-20261122-001", "2026-11-22"),
                (2, "L-20261122-002", "2026-11-22"),
                (3, "L-SEED-001", "2026-11-22"),
                (4, "HISTORICO", "2026-11-20"),
            ],
        )
        db.commit()


def codigos_barras(ruta):
    with closing(sqlite3.connect(ruta)) as db:
        return dict(db.execute("SELECT codigo, codigo_barras FROM lotes_produccion"))


def test_migracion_agrega_el_codigo_de_barras_con_respaldo(tmp_path):
    ruta = tmp_path / "anterior.db"
    crear_base_anterior(ruta)

    respaldo = migrar(ruta)

    assert respaldo.is_file()
    assert codigos_barras(ruta) == {
        "L-20261122-001": "2026112200013",
        "L-20261122-002": "2026112200020",
        "L-SEED-001": "2026112290014",
        "HISTORICO": "2026112090010",
    }


def test_migracion_crea_un_indice_unico(tmp_path):
    ruta = tmp_path / "anterior.db"
    crear_base_anterior(ruta)
    migrar(ruta)

    with closing(sqlite3.connect(ruta)) as db:
        with pytest.raises(sqlite3.IntegrityError):
            db.execute("UPDATE lotes_produccion SET codigo_barras = '2026112200013' WHERE id = 2")


def test_migracion_completa_solo_los_lotes_sin_codigo_y_es_idempotente(tmp_path):
    ruta = tmp_path / "anterior.db"
    crear_base_anterior(ruta)
    migrar(ruta)
    with closing(sqlite3.connect(ruta)) as db:
        db.execute(
            "INSERT INTO lotes_produccion (id, codigo, fecha_produccion) VALUES (5, 'L-20261122-003', '2026-11-22')"
        )
        db.commit()

    assert migrar(ruta) is not None
    assert codigos_barras(ruta)["L-20261122-003"] == "2026112200037"
    assert codigos_barras(ruta)["L-20261122-001"] == "2026112200013"
    assert migrar(ruta) is None


def test_migracion_exige_una_base_existente(tmp_path):
    with pytest.raises(ValueError):
        migrar(tmp_path / "no-existe.db")
