"""Sectores del establecimiento."""

from scripts.seed_common import CANTIDAD
from src.sector.models import Sector


SECTORES = ["Recepción de materias primas", "Depósito de alimentos secos", "Cámara de refrigeración",
    "Cámara de congelación", "Lavado de vegetales", "Preparación de carnes", "Cocina caliente",
    "Panadería", "Pastelería", "Envasado", "Despacho", "Lavado de vajilla",
    "Depósito de productos de limpieza", "Vestuario del personal", "Gestión de residuos"]

def cargar_sectores(crear):
    sectores = []
    for i in range(CANTIDAD):
        sector, _ = crear(Sector, {"nombre": SECTORES[i]}, activo=True)
        sectores.append(sector)

    return sectores
