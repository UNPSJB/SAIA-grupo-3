"""Actualizar SQLite tras integrar ramas; ejecutar con el backend detenido."""
import argparse
from datetime import datetime
from pathlib import Path
import sqlite3
from uuid import uuid4


def migrar(ruta: Path):
    ruta = Path(ruta).resolve()
    if not ruta.is_file():
        raise ValueError(f"No existe la BDD: {ruta}")
    cambios = {
        "equipos": [("controla_temperatura", "BOOLEAN NOT NULL DEFAULT 0"),
                    ("temperatura_minima", "FLOAT"), ("temperatura_maxima", "FLOAT")],
        "insumos": [("stock_minimo", "FLOAT")],
        "insumos_quimicos": [("stock_minimo", "FLOAT")],
        "notificaciones": [("resuelta", "BOOLEAN NOT NULL DEFAULT 0")],
    }
    with sqlite3.connect(f'{ruta.as_uri()}?mode=rw', uri=True) as db:
        pendientes = []
        for tabla, campos in cambios.items():
            columnas = {fila[1] for fila in db.execute(f'PRAGMA table_info("{tabla}")')}
            if not columnas:
                raise ValueError(f"Falta la tabla {tabla}; verificá la BDD seleccionada.")
            pendientes.extend((tabla, columna, tipo) for columna, tipo in campos if columna not in columnas)
        if not pendientes:
            return None
        respaldo = ruta.with_name(ruta.name + f'.integracion-{datetime.now():%Y%m%d-%H%M%S}-{uuid4().hex[:6]}.bak')
        with sqlite3.connect(respaldo) as destino:
            db.backup(destino)
        db.execute('BEGIN IMMEDIATE')
        try:
            for tabla, columna, tipo in pendientes:
                db.execute(f'ALTER TABLE "{tabla}" ADD COLUMN "{columna}" {tipo}')
            db.commit()
        except Exception:
            db.rollback()
            raise
    return respaldo


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--database', required=True, type=Path)
    respaldo = migrar(parser.parse_args().database)
    print(f'Migración completada. Respaldo: {respaldo}' if respaldo else 'Columnas ya actualizadas; sin cambios.')
