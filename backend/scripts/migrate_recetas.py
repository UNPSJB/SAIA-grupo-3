<<<<<<< HEAD
<<<<<<< HEAD
"""Migración SQLite repetible para recetas (E9-01, E9-02, E9-04 y E10-01). Detener el backend antes de ejecutarla."""
=======
"""Migración SQLite repetible para recetas (E9-01, E9-02 y E9-04). Detener el backend antes de ejecutarla."""
>>>>>>> dev
=======
"""Migración SQLite repetible para recetas (E9-01, E9-02, E9-04 y E10-01). Detener el backend antes de ejecutarla."""
>>>>>>> origin/feature/composicionporcentual
import argparse
import sqlite3
from datetime import datetime
from pathlib import Path
from uuid import uuid4

from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session

import src.main
from src.models import ModeloBase
from src.receta.composicion import recalcular_todas
from src.unidadMedida.models import UnidadMedida

<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> origin/feature/composicionporcentual
FACTORES_CONOCIDOS = {
    "un": 1.0, "par": 2.0,
    "mg": 0.001, "g": 1.0, "kg": 1000.0, "lb": 453.59237,
    "ml": 1.0, "l": 1000.0, "cc": 1.0, "gal": 3785.411784,
    "cm": 1.0, "m": 100.0,
}

<<<<<<< HEAD
=======
>>>>>>> dev
=======
>>>>>>> origin/feature/composicionporcentual
COLUMNAS = {
    "insumos": {
        "tipo": "VARCHAR(11) NOT NULL DEFAULT 'INGREDIENTE'",
        "aditivo_referencia_id": "INTEGER REFERENCES aditivos_referencia(id)",
<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> origin/feature/composicionporcentual
        "densidad_g_ml": "FLOAT",
        "peso_unidad_g": "FLOAT",
    },
    "unidad_medida": {"factor_base": "FLOAT"},
    "versiones_receta": {
        "composicion_completa": "BOOLEAN NOT NULL DEFAULT 0",
        "composicion_total_gramos": "FLOAT",
        "composicion_calculada_en": "DATETIME",
    },
    "renglones_receta": {"gramos": "FLOAT", "porcentaje": "FLOAT"},
<<<<<<< HEAD
=======
    },
>>>>>>> dev
=======
>>>>>>> origin/feature/composicionporcentual
    "lotes_produccion": {
        "version_receta_id": "INTEGER REFERENCES versiones_receta(id)",
        "factor_receta": "FLOAT",
        "pasos_pendientes_al_cerrar": "INTEGER",
        "motivo_cierre_pendientes": "VARCHAR(500)",
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
    if any(tabla in {"unidad_medida", "versiones_receta"} for tabla, _, _ in pendientes):
        motor = create_engine(f"sqlite:///{ruta}")
        with Session(motor) as sesion:
            for unidad in sesion.scalars(select(UnidadMedida).where(UnidadMedida.factor_base.is_(None))):
                unidad.factor_base = FACTORES_CONOCIDOS.get(unidad.sufijo.strip().lower())
            recalcular_todas(sesion)
            sesion.commit()
        motor.dispose()
    return respaldo


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--database", type=Path, required=True, help="Ruta real del archivo SQLite configurado en DB_URL")
    args = parser.parse_args()
    respaldo = migrar(args.database)
    print(f"Migración completada. Respaldo: {respaldo}" if respaldo else "La BDD ya tiene las tablas de recetas. Sin cambios.")


if __name__ == "__main__":
    main()
