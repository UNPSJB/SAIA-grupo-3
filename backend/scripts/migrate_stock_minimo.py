"""Migración SQLite repetible. Detener el backend antes de ejecutarla."""
import argparse
from datetime import datetime
from pathlib import Path
import sqlite3
from uuid import uuid4


def migrar(ruta: Path) -> Path | None:
    ruta = Path(ruta).resolve()
    if not ruta.is_file():
        raise ValueError(f"No existe la BDD: {ruta}")
    cambios = {
        "insumos": ("stock_minimo", "FLOAT"),
        "insumos_quimicos": ("stock_minimo", "FLOAT"),
        "notificaciones": ("resuelta", "BOOLEAN NOT NULL DEFAULT 0"),
    }
    with sqlite3.connect(f"{ruta.as_uri()}?mode=rw", uri=True) as db:
        pendientes = []
        for tabla, (columna, tipo) in cambios.items():
            columnas = {fila[1] for fila in db.execute(f'PRAGMA table_info("{tabla}")')}
            if not columnas:
                raise ValueError(f"Falta la tabla {tabla}; verificá que elegiste la BDD del proyecto.")
            if columna not in columnas:
                pendientes.append((tabla, columna, tipo))
        if not pendientes:
            return None
        respaldo = ruta.with_name(ruta.name + f'.stock-{datetime.now():%Y%m%d-%H%M%S}-{uuid4().hex[:6]}.bak')
        with sqlite3.connect(respaldo) as destino:
            db.backup(destino)
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
    parser.add_argument('--database', type=Path, required=True, help='Ruta real del archivo SQLite configurado en DB_URL')
    args = parser.parse_args()
    respaldo = migrar(args.database)
    print(f'Migración completada. Respaldo: {respaldo}' if respaldo else 'La BDD ya tiene las columnas. Sin cambios.')


if __name__ == '__main__':
    main()