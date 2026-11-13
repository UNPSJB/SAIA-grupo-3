"""Insumos generales e ingredientes de producción."""

from scripts.seed_common import CANTIDAD
from src.insumos.models import Insumo


INSUMOS = ["Guantes de nitrilo", "Cofias descartables", "Barbijos tricapa", "Delantales descartables",
    "Bolsas para residuos", "Papel para secado de manos", "Paños descartables", "Film alimentario",
    "Bolsas de envasado al vacío", "Etiquetas de trazabilidad", "Precintos de seguridad",
    "Esponjas no abrasivas", "Cepillos de uñas", "Fundas para calzado", "Papel absorbente industrial"]

DENSIDADES = {"Agua": 1.0, "Aceite": 0.92, "Leche": 1.03}

INGREDIENTES = [
    ("Harina de trigo", "kg", 500.0),
    ("Azúcar", "kg", 200.0),
    ("Agua", "L", 500.0),
    ("Levadura", "g", 5000.0),
    ("Aceite", "L", 100.0),
    ("Sal", "kg", 100.0),
    ("Tomate triturado", "kg", 100.0),
    ("Leche", "L", 100.0),
    ("Carne vacuna", "kg", 100.0),
    ("Cebolla", "kg", 100.0),
    ("Verduras para tarta", "kg", 100.0),
    ("Papa", "kg", 100.0),
    ("Huevo", "kg", 50.0),
]


def cargar_insumos(crear, unidades, unidades_por_sufijo):
    insumos = []
    unidad = unidades[0]
    for i in range(CANTIDAD):
        insumo, _ = crear(Insumo, {"nombre": INSUMOS[i]},
            unidad_medida_id=unidad.id, activo=True)
        insumos.append(insumo)
    ingredientes_por_nombre = {}
    for nombre, sufijo, _ in INGREDIENTES:
        ingrediente, _ = crear(
            Insumo,
            {"nombre": nombre},
            unidad_medida_id=unidades_por_sufijo[sufijo].id,
            activo=True,
            densidad_g_ml=DENSIDADES.get(nombre),
        )
        if ingrediente.densidad_g_ml is None and nombre in DENSIDADES:
            ingrediente.densidad_g_ml = DENSIDADES[nombre]
        ingredientes_por_nombre[nombre] = ingrediente

    return insumos, ingredientes_por_nombre
