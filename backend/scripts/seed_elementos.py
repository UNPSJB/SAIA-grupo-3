"""Elementos de limpieza y fechas de recambio."""

from datetime import timedelta

from scripts.seed_common import CANTIDAD
from src.elementos.models import Elemento


ELEMENTOS = ["Escoba de cerdas suaves", "Secador de piso", "Mopa de microfibra", "Balde con escurridor",
    "Cepillo de juntas", "Cepillo para desagües", "Paño azul para mesadas", "Paño rojo para residuos",
    "Paño verde para vegetales", "Esponja para vajilla", "Espátula para hornos", "Pulverizador graduado",
    "Cepillo para bandejas", "Pala de residuos", "Carro de limpieza",
    "Guantes de nitrilo", "Cofias descartables", "Barbijos tricapa", "Delantales descartables",
    "Bolsas para residuos", "Papel para secado de manos", "Paños descartables", "Film alimentario",
    "Bolsas de envasado al vacío", "Etiquetas de trazabilidad", "Precintos de seguridad",
    "Esponjas no abrasivas", "Cepillos de uñas", "Fundas para calzado", "Papel absorbente industrial"]

def cargar_elementos(crear, hoy):
    elementos = []
    for i in range(len(ELEMENTOS)):
        elemento, _ = crear(Elemento, {"nombre": ELEMENTOS[i]}, frecuencia_recambio=60,
            fecha_ultimo_recambio=hoy - timedelta(days=60),
            fecha_proximo_recambio=hoy + timedelta(days=[-7, 0, 7, 30, 60][i % 5]), activo=True)
        elementos.append(elemento)

    return elementos
