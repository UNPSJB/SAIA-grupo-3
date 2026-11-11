"""Migración SQLite repetible para E9-01 (recetas). Detener el backend antes de ejecutarla."""
import argparse
import sqlite3
from datetime import datetime
from pathlib import Path
from uuid import uuid4

from sqlalchemy import create_engine

import src.main
from src.models import ModeloBase

COLUMNAS_INSUMOS = {
    "tipo": "VARCHAR(11) NOT NULL DEFAULT 'INGREDIENTE'",
    "aditivo_referencia_id": "INTEGER REFERENCES aditivos_referencia(id)",
}


def migrar(ruta: Path) -> Path | None:
    ruta = Path(ruta).resolve()
    if not ruta.is_file():
        raise ValueError(f"No existe la BDD: {ruta}")
    with sqlite3.connect(f"{ruta.as_uri()}?mode=rw", uri=True) as db:
        columnas = {fila[1] for fila in db.execute('PRAGMA table_info("insumos")')}
        if not columnas:
            raise ValueError("Falta la tabla insumos; verificá que elegiste la BDD del proyecto.")
        tablas = {fila[0] for fila in db.execute("SELECT name FROM sqlite_master WHERE type='table'")}
        pendientes = [(columna, tipo) for columna, tipo in COLUMNAS_INSUMOS.items() if columna not in columnas]
        if not pendientes and "recetas" in tablas:
            return None
        respaldo = ruta.with_name(ruta.name + f".recetas-{datetime.now():%Y%m%d-%H%M%S}-{uuid4().hex[:6]}.bak")
        with sqlite3.connect(respaldo) as destino:
            db.backup(destino)
    motor = create_engine(f"sqlite:///{ruta}")
    ModeloBase.metadata.create_all(bind=motor)
    motor.dispose()
    with sqlite3.connect(f"{ruta.as_uri()}?mode=rw", uri=True) as db:
        db.execute("BEGIN IMMEDIATE")
        try:
            for columna, tipo in pendientes:
                db.execute(f'ALTER TABLE "insumos" ADD COLUMN "{columna}" {tipo}')
            db.commit()
        except Exception:
            db.rollback()
            raise
    return respaldo


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--database", type=Path, required=True, help="Ruta real del archivo SQLite configurado en DB_URL")
    args = parser.parse_args()
    respaldo = migrar(args.database)
    print(f"Migración completada. Respaldo: {respaldo}" if respaldo else "La BDD ya tiene las tablas de recetas. Sin cambios.")


if __name__ == "__main__":
    main()
