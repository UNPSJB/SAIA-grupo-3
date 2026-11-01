"""Equipos y sus sectores."""

from scripts.seed_common import CANTIDAD
from src.equipos.models import Equipo, TipoEquipo


EQUIPOS = ["Balanza de recepción", "Termohigrómetro del depósito", "Termómetro de cámara frigorífica",
    "Sonda de temperatura del congelador", "Lavadora de vegetales", "Mesa de corte de acero inoxidable",
    "Horno convector", "Amasadora espiral", "Batidora planetaria", "Selladora de envases",
    "Carro térmico de despacho", "Lavavajillas industrial", "Dosificador de detergente",
    "Dispensador de jabón", "Contenedor de residuos con pedal"]

def cargar_equipos(crear, sectores):
    equipos = []
    tipos_equipo = [TipoEquipo.INSTRUMENTO] * 4 + [TipoEquipo.EQUIPO, TipoEquipo.HERRAMIENTA] + [TipoEquipo.EQUIPO] * 7 + [TipoEquipo.HERRAMIENTA] * 2
    for i in range(CANTIDAD):
        sector = sectores[i]
        equipo, _ = crear(Equipo, {"numero_serie": f"SAIA-EQ-{i + 1:04d}"}, nombre=EQUIPOS[i],
            tipo=tipos_equipo[i], sector_id=sector.id, activo=True,
            periodicidad_dias=[365, 180, 90][i % 3])
        equipos.append(equipo)

    return equipos
