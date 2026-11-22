"""Agrega la anulación y los estados de producción a los lotes; ejecutar con el backend detenido."""
import argparse
from datetime import datetime
from pathlib import Path
import sqlite3
from uuid import uuid4

COLUMNAS = [
    ("fecha_anulacion", "DATETIME"),
    ("anulado_por_id", "INTEGER REFERENCES personal(id)"),
    ("motivo_anulacion", "VARCHAR(500)"),
]

REALIZADOS = "SELECT COUNT(*) FROM pasos_lote p WHERE p.lote_id = l.id AND UPPER(p.estado) = 'REALIZADO'"
TOTAL = "SELECT COUNT(*) FROM pasos_lote p WHERE p.lote_id = l.id"
ESTADO_CALCULADO = f"""
    CASE
        WHEN ({REALIZADOS}) = 0 THEN 'abierto'
        WHEN ({REALIZADOS}) < ({TOTAL}) THEN 'en_produccion'
        ELSE 'finalizado'
    END
"""
EN_CURSO = "l.estado IN ('abierto', 'en_produccion', 'finalizado')"


def migrar(ruta: Path):
    ruta = Path(ruta).resolve()
    if not ruta.is_file():
        raise ValueError(f"No existe la BDD: {ruta}")
    with sqlite3.connect(f'{ruta.as_uri()}?mode=rw', uri=True) as db:
        for tabla in ("lotes_produccion", "pasos_lote"):
            if not db.execute(f'PRAGMA table_info("{tabla}")').fetchall():
                raise ValueError(f"Falta la tabla {tabla}; verificá la BDD seleccionada.")
        columnas = {fila[1] for fila in db.execute('PRAGMA table_info("lotes_produccion")')}
        pendientes = [(columna, tipo) for columna, tipo in COLUMNAS if columna not in columnas]
        desactualizados = db.execute(
            f"SELECT COUNT(*) FROM lotes_produccion l WHERE {EN_CURSO} AND l.estado <> {ESTADO_CALCULADO}"
        ).fetchone()[0]
        if not pendientes and not desactualizados:
            return None
        respaldo = ruta.with_name(ruta.name + f'.estado-lote-{datetime.now():%Y%m%d-%H%M%S}-{uuid4().hex[:6]}.bak')
        with sqlite3.connect(respaldo) as destino:
            db.backup(destino)
        db.execute('BEGIN IMMEDIATE')
        try:
            for columna, tipo in pendientes:
                db.execute(f'ALTER TABLE "lotes_produccion" ADD COLUMN "{columna}" {tipo}')
            db.execute(f"UPDATE lotes_produccion AS l SET estado = {ESTADO_CALCULADO} WHERE {EN_CURSO}")
            db.commit()
        except Exception:
            db.rollback()
            raise
    return respaldo


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--database', required=True, type=Path)
    respaldo = migrar(parser.parse_args().database)
    print(f'Migración completada. Respaldo: {respaldo}' if respaldo else 'Lotes ya actualizados; sin cambios.')
