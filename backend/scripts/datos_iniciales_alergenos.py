"""Carga los alérgenos de declaración obligatoria del CAA (datos del sistema, no de prueba)."""

import argparse
import json
from pathlib import Path

from sqlalchemy import create_engine, func, select
from sqlalchemy.orm import Session

import src.main
from src.alergeno.models import Alergeno
from src.config import settings
from src.models import ModeloBase

ARCHIVO = Path(__file__).resolve().parent.parent / "datos_iniciales" / "alergenos_caa.json"


def cargar_alergenos_iniciales(db: Session, archivo: Path = ARCHIVO) -> int:
    datos = json.loads(archivo.read_text(encoding="utf-8"))
    creados = 0
    for orden, item in enumerate(datos["alergenos"], start=1):
        existe = db.scalar(select(Alergeno.id).where(func.lower(Alergeno.nombre) == item["nombre"].lower()))
        if existe is not None:
            continue
        db.add(
            Alergeno(
                nombre=item["nombre"],
                grupo=item["grupo"],
                texto_declaracion=item["texto_declaracion"],
                implica_gluten=item.get("implica_gluten", False),
                orden=orden,
                activo=True,
            )
        )
        creados += 1
    db.flush()
    return creados


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--database", help="URL de la base (por defecto, DB_URL del .env)")
    args = parser.parse_args()
    motor = create_engine(args.database or settings.DB_URL)
    ModeloBase.metadata.create_all(bind=motor)
    with Session(motor) as db:
        creados = cargar_alergenos_iniciales(db)
        db.commit()
    print(f"Alérgenos del CAA: {creados} creados." if creados else "Los alérgenos del CAA ya estaban cargados.")
    motor.dispose()


if __name__ == "__main__":
    main()
