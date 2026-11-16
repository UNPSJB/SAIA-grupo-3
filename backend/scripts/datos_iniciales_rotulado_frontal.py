"""Carga el primer conjunto de parámetros del rotulado frontal (datos del sistema, no de prueba)."""

import argparse
import json
from pathlib import Path

from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session

import src.main
from src.config import settings
from src.models import ModeloBase
from src.rotuladoFrontal import schemas
from src.rotuladoFrontal.constants import EstadoConjunto
from src.rotuladoFrontal.models import ConjuntoParametros
from src.rotuladoFrontal.services import crear_conjunto, validar_publicable

ARCHIVO = Path(__file__).resolve().parent.parent / "datos_iniciales" / "parametros_rotulado_frontal.json"


def leer_parametros_iniciales(archivo: Path = ARCHIVO) -> schemas.ConjuntoDatos:
    return schemas.ConjuntoDatos.model_validate(json.loads(archivo.read_text(encoding="utf-8")))


def cargar_parametros_iniciales(db: Session, archivo: Path = ARCHIVO) -> ConjuntoParametros | None:
    if db.scalar(select(ConjuntoParametros.id).limit(1)) is not None:
        return None
    conjunto = crear_conjunto(db, leer_parametros_iniciales(archivo), None, EstadoConjunto.VIGENTE)
    validar_publicable(conjunto)
    return conjunto


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--database", help="URL de la base (por defecto, DB_URL del .env)")
    args = parser.parse_args()
    motor = create_engine(args.database or settings.DB_URL)
    ModeloBase.metadata.create_all(bind=motor)
    with Session(motor) as db:
        conjunto = cargar_parametros_iniciales(db)
        db.commit()
        if conjunto is None:
            print("Ya hay parámetros de rotulado frontal cargados. Sin cambios.")
        else:
            print(f"Parámetros de rotulado frontal cargados: versión {conjunto.numero} vigente desde {conjunto.fecha_vigencia}.")
    motor.dispose()


if __name__ == "__main__":
    main()
