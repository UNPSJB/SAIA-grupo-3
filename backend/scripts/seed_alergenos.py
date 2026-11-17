"""Marcas de alérgenos y gluten (TACC) de prueba en los ingredientes y aditivos."""

from sqlalchemy import select

from scripts.datos_iniciales_alergenos import cargar_alergenos_iniciales
from src.alergeno.models import Alergeno

MARCAS = {
    "Harina de trigo": (["Trigo"], True),
    "Huevo": (["Huevo"], False),
    "Leche": (["Leche"], False),
    "Lecitina de soja líquida": (["Soja"], False),
}


def cargar_alergenos(db, ingredientes, aditivos):
    cargar_alergenos_iniciales(db)
    alergenos = {a.nombre: a for a in db.scalars(select(Alergeno))}
    insumos = {**ingredientes, **aditivos}
    for nombre, (marcas, gluten) in MARCAS.items():
        insumo = insumos.get(nombre)
        if insumo is None or insumo.alergenos:
            continue
        insumo.alergenos = [alergenos[marca] for marca in marcas]
        insumo.contiene_gluten = gluten
    db.flush()
    return alergenos
