"""Planes de limpieza y responsables."""

from scripts.seed_common import CANTIDAD
from scripts.seed_sectores import SECTORES
from src.plan.models import Plan


def cargar_planes(crear, sectores, equipos, tareas, personas, admin, ayer):
    planes = []
    for i in range(CANTIDAD):
        sector = sectores[i]
        equipo = equipos[i]
        tarea = tareas[i]
        responsable = admin if i % 5 == 0 else personas[1]
        plan, nuevo = crear(Plan, {"nombre": f"POES - {SECTORES[i]}"}, responsable_id=responsable.id,
            descripcion=f"Programa de higiene y verificación del sector {SECTORES[i].lower()}.",
            sector_id=sector.id, equipo_id=equipo.id, activo=True, fecha_inicio=ayer, fecha_fin=None)
        if nuevo:
            plan.tareas = [tarea]
        planes.append(plan)

    return planes
