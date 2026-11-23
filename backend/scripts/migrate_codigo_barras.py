import argparse
from datetime import date, datetime
from pathlib import Path
import re
import sqlite3
from uuid import uuid4

from src.loteProduccion.codigo_barras import generar_codigo_barras
from src.loteProduccion.constants import PRIMER_NUMERO_SIN_CODIGO

PATRON_CODIGO = re.compile(r"L-([0-9]{8})-([0-9]{3,4})")
DESCRIPCION = "Agrega el código de barras a los lotes de producción; ejecutar con el backend detenido."


def _desde_codigo(codigo: str) -> tuple[date, int] | None:
    coincidencia = PATRON_CODIGO.fullmatch(codigo or "")
    if coincidencia is None:
        return None
    try:
        fecha = datetime.strptime(coincidencia[1], "%Y%m%d").date()
    except ValueError:
        return None
    numero = int(coincidencia[2])
    return (fecha, numero) if 1 <= numero <= 9999 else None


def _asignar(lotes: list[tuple[int, str, str]], usados: set[str]) -> dict[int, str]:
    asignados = {}
    pendientes = []
    for lote_id, codigo, fecha in lotes:
        origen = _desde_codigo(codigo)
        codigo_barras = generar_codigo_barras(*origen) if origen else None
        if codigo_barras and codigo_barras not in usados:
            asignados[lote_id] = codigo_barras
            usados.add(codigo_barras)
        else:
            pendientes.append((lote_id, date.fromisoformat(str(fecha)[:10])))
    for lote_id, fecha in pendientes:
        numero = PRIMER_NUMERO_SIN_CODIGO
        while generar_codigo_barras(fecha, numero) in usados:
            numero += 1
        asignados[lote_id] = generar_codigo_barras(fecha, numero)
        usados.add(asignados[lote_id])
    return asignados


def migrar(ruta: Path):
    ruta = Path(ruta).resolve()
    if not ruta.is_file():
        raise ValueError(f"No existe la BDD: {ruta}")
    with sqlite3.connect(f'{ruta.as_uri()}?mode=rw', uri=True) as db:
        if not db.execute('PRAGMA table_info("lotes_produccion")').fetchall():
            raise ValueError("Falta la tabla lotes_produccion; verificá la BDD seleccionada.")
        columnas = {fila[1] for fila in db.execute('PRAGMA table_info("lotes_produccion")')}
        falta_columna = "codigo_barras" not in columnas
        condicion = "" if falta_columna else " WHERE codigo_barras IS NULL"
        lotes = db.execute(
            f"SELECT id, codigo, fecha_produccion FROM lotes_produccion{condicion} ORDER BY id"
        ).fetchall()
        if not falta_columna and not lotes:
            return None
        usados = set() if falta_columna else {
            fila[0] for fila in db.execute(
                "SELECT codigo_barras FROM lotes_produccion WHERE codigo_barras IS NOT NULL"
            )
        }
        respaldo = ruta.with_name(ruta.name + f'.codigo-barras-{datetime.now():%Y%m%d-%H%M%S}-{uuid4().hex[:6]}.bak')
        with sqlite3.connect(respaldo) as destino:
            db.backup(destino)
        db.execute('BEGIN IMMEDIATE')
        try:
            if falta_columna:
                db.execute('ALTER TABLE "lotes_produccion" ADD COLUMN "codigo_barras" VARCHAR(13)')
            db.execute(
                'CREATE UNIQUE INDEX IF NOT EXISTS "ix_lotes_produccion_codigo_barras" '
                'ON "lotes_produccion" ("codigo_barras")'
            )
            db.executemany(
                "UPDATE lotes_produccion SET codigo_barras = ? WHERE id = ?",
                [(codigo_barras, lote_id) for lote_id, codigo_barras in _asignar(lotes, usados).items()],
            )
            db.commit()
        except Exception:
            db.rollback()
            raise
    return respaldo


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=DESCRIPCION)
    parser.add_argument('--database', required=True, type=Path)
    respaldo = migrar(parser.parse_args().database)
    print(f'Migración completada. Respaldo: {respaldo}' if respaldo else 'Lotes ya actualizados; sin cambios.')
