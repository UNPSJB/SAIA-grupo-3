"""Insumos de limpieza, higiene y EPP (no son ingredientes de produccion)."""

from scripts.seed_common import CANTIDAD
from src.insumos.models import Insumo


INSUMOS_LIMPIEZA = [
    "Guantes de nitrilo",
    "Cofias descartables",
    "Barbijos tricapa",
    "Delantales descartables",
    "Bolsas para residuos",
    "Papel para secado de manos",
    "Paños descartables",
    "Film alimentario",
    "Bolsas de envasado al vacío",
    "Etiquetas de trazabilidad",
    "Precintos de seguridad",
    "Esponjas no abrasivas",
    "Cepillos de uñas",
    "Fundas para calzado",
    "Papel absorbente industrial",
]


def cargar_insumos_limpieza(crear, unidades):
    insumos = []
    unidad = unidades[0]
    for i in range(min(CANTIDAD, len(INSUMOS_LIMPIEZA))):
        insumo, _ = crear(Insumo, {"nombre": INSUMOS_LIMPIEZA[i]},
            unidad_medida_id=unidad.id, activo=True)
        insumos.append(insumo)
    return insumos