"""Importa una tabla de alimentos de referencia desde un CSV. Se puede repetir sin duplicar."""
import argparse
from pathlib import Path

import src.main
from src.database import SessionLocal
from src.nutricion.services import importar_csv


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--archivo", type=Path, required=True, help="Ruta del CSV con los valores por 100 g")
    parser.add_argument("--fuente", required=True, help="Nombre de la base de referencia (por ejemplo, ARGENFOODS 2024)")
    args = parser.parse_args()
    contenido = args.archivo.read_text(encoding="utf-8-sig")
    with SessionLocal() as db:
        resultado = importar_csv(db, contenido, args.fuente)
    print(f"Fuente: {resultado.fuente}")
    print(f"Creados: {resultado.creados} · Actualizados: {resultado.actualizados} · Sin cambios: {resultado.sin_cambios}")
    for error in resultado.errores:
        print(f"  {error}")


if __name__ == "__main__":
    main()
