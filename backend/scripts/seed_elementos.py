"""Elementos de limpieza y fechas de recambio."""

from datetime import timedelta

from scripts.seed_common import CANTIDAD
from src.elementos.models import Elemento


ELEMENTOS = ["Escoba de cerdas suaves", "Secador de piso", "Mopa de microfibra", "Balde con escurridor",
    "Cepillo de juntas", "Cepillo para desagües", "Paño azul para mesadas", "Paño rojo para residuos",
    "Paño verde para vegetales", "Esponja para vajilla", "Espátula para hornos", "Pulverizador graduado",
    "Cepillo para bandejas", "Pala de residuos", "Carro de limpieza"]

def cargar_elementos(crear, hoy):
    elementos = []
    for i in range(CANTIDAD):
        elemento, _ = crear(Elemento, {"nombre": ELEMENTOS[i]}, frecuencia_recambio=60,
            fecha_ultimo_recambio=hoy - timedelta(days=60),
            fecha_proximo_recambio=hoy + timedelta(days=[-7, 0, 7, 30, 60][i % 5]), activo=True)
        elementos.append(elemento)

    return elementos
