import argparse
import sqlite3
from datetime import datetime
from pathlib import Path
from uuid import uuid4

from sqlalchemy import create_engine

import src.main
from src.models import ModeloBase

COLUMNAS = {
    "insumos": {
        "tipo": "VARCHAR(11) NOT NULL DEFAULT 'INGREDIENTE'",
        "aditivo_referencia_id": "INTEGER REFERENCES aditivos_referencia(id)",
    },
    "lotes_produccion": {
        "version_receta_id": "INTEGER REFERENCES versiones_receta(id)",
        "factor_receta": "FLOAT",
    },
}


def migrar(ruta: Path) -> Path | None:
    ruta = Path(ruta).resolve()
    if not ruta.is_file():
        raise ValueError(f"No existe la BDD: {ruta}")
    with sqlite3.connect(f"{ruta.as_uri()}?mode=rw", uri=True) as db:
        pendientes = []
        for tabla, columnas_nuevas in COLUMNAS.items():
            columnas = {fila[1] for fila in db.execute(f'PRAGMA table_info("{tabla}")')}
            if not columnas:
                raise ValueError(f"Falta la tabla {tabla}; verificá que elegiste la BDD del proyecto.")
            pendientes += [(tabla, columna, tipo) for columna, tipo in columnas_nuevas.items() if columna not in columnas]
        tablas = {fila[0] for fila in db.execute("SELECT name FROM sqlite_master WHERE type='table'")}
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
            for tabla, columna, tipo in pendientes:
                db.execute(f'ALTER TABLE "{tabla}" ADD COLUMN "{columna}" {tipo}')
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
