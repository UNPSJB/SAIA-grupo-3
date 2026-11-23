"""Ingredientes de producción (insumos alimentarios para recetas)."""

from src.insumos.models import Insumo


DENSIDADES = {"Agua": 1.0, "Aceite": 0.92, "Leche": 1.03}

DENOMINACIONES = {
    "Harina de trigo": "harina de trigo enriquecida (Ley 25.630)",
    "Aceite": "aceite de girasol",
    "Leche": "leche entera",
    "Huevo": "huevo entero",
    "Carne vacuna": "carne vacuna",
}

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
        if ingrediente.denominacion_rotulo is None and nombre in DENOMINACIONES:
            ingrediente.denominacion_rotulo = DENOMINACIONES[nombre]
        ingredientes_por_nombre[nombre] = ingrediente

    return ingredientes_por_nombre
