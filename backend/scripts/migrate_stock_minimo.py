"""Migración SQLite repetible. Detener el backend antes de ejecutarla."""
import argparse
from datetime import datetime
from pathlib import Path
import sqlite3
import re
from uuid import uuid4


def _preparar_cantidad_historica(db):
    """Conserva el contador antiguo para auditoría; ya no determina el stock.

    SQLite no permite cambiar DEFAULT con ALTER COLUMN. Se reconstruye la
    tabla dentro de la transacción, conservando filas, restricciones e índices.
    """
    original = db.execute("SELECT sql FROM sqlite_master WHERE type='table' AND name='insumos'").fetchone()[0]
    nueva = re.sub(r'(?i)^(CREATE TABLE\s+)(?:"insumos"|`insumos`|\[insumos\]|insumos)',
                   r'\1"_insumos_merge_stock"', original, count=1)
    nueva, reemplazos = re.subn(
        r'(?i)((?:"cantidad"|`cantidad`|\[cantidad\]|\bcantidad\b)\s+[^,\n]+)',
        lambda m: m[0] + ' DEFAULT 0', nueva, count=1,
    )
    if nueva == original or reemplazos != 1:
        raise ValueError('No se pudo preparar la columna cantidad histórica de forma segura.')
    estructuras = db.execute("SELECT sql FROM sqlite_master WHERE tbl_name='insumos' AND type IN ('index','trigger') AND sql IS NOT NULL").fetchall()
    columnas = [fila[1] for fila in db.execute('PRAGMA table_info(insumos)')]
    nombres = ', '.join('"' + nombre.replace('"', '""') + '"' for nombre in columnas)
    secuencia = None
    if db.execute("SELECT 1 FROM sqlite_master WHERE name='sqlite_sequence'").fetchone():
        secuencia = db.execute("SELECT seq FROM sqlite_sequence WHERE name='insumos'").fetchone()
    db.execute(nueva)
    db.execute(f'INSERT INTO "_insumos_merge_stock" ({nombres}) SELECT {nombres} FROM insumos')
    db.execute('DROP TABLE insumos')
    db.execute('ALTER TABLE "_insumos_merge_stock" RENAME TO insumos')
    for (sql,) in estructuras:
        db.execute(sql)
    if secuencia is not None:
        db.execute("UPDATE sqlite_sequence SET seq = max(seq, ?) WHERE name='insumos'", (secuencia[0],))


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
        info = db.execute('PRAGMA table_info(insumos)').fetchall()
        cantidad_legacy = next((col for col in info if col[1] == 'cantidad'), None)
        ajustar_legacy = cantidad_legacy is not None and cantidad_legacy[3] and cantidad_legacy[4] is None
        if not pendientes and not ajustar_legacy:
            return None
        if db.execute('PRAGMA foreign_key_check').fetchall():
            raise ValueError('La BDD tiene referencias inválidas. Revisalas antes de migrar.')
        respaldo = ruta.with_name(ruta.name + f'.stock-{datetime.now():%Y%m%d-%H%M%S}-{uuid4().hex[:6]}.bak')
        with sqlite3.connect(respaldo) as destino:
            db.backup(destino)
        # Al reconstruir insumos se conservan las FK de las tablas relacionadas.
        db.execute('PRAGMA foreign_keys = OFF')
        db.execute("BEGIN IMMEDIATE")
        try:
            for tabla, columna, tipo in pendientes:
                db.execute(f'ALTER TABLE "{tabla}" ADD COLUMN "{columna}" {tipo}')
            if ajustar_legacy:
                _preparar_cantidad_historica(db)
            if db.execute('PRAGMA foreign_key_check').fetchall():
                raise ValueError('La migración no preservó las referencias. Se revierte.')
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
