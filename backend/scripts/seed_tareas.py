"""Tareas y asociaciones con elementos y químicos."""

from scripts.seed_common import CANTIDAD
from scripts.seed_equipos import EQUIPOS
from src.tarea.models import FrecuenciaTarea, Tarea, TareaInsumoQuimico


def cargar_tareas(crear, equipos, elementos, quimicos):
    tareas = []
    for i in range(CANTIDAD):
        equipo = equipos[i]
        elemento = elementos[i]
        quimico = quimicos[i]
        nombre_tarea = f"Limpieza y verificación de {EQUIPOS[i].lower()}"
        tarea, nueva = crear(Tarea, {"nombre": nombre_tarea}, frecuencia=FrecuenciaTarea.DIARIA,
            equipo_id=equipo.id, procedimiento=f"Retirar residuos de {EQUIPOS[i].lower()}, limpiar según la ficha del producto, enjuagar cuando corresponda y verificar la superficie. Registrar la ejecución y el consumo efectivo; no mezclar productos.")
        if nueva:
            tarea.elementos = [elemento]
        crear(TareaInsumoQuimico, {"tarea_id": tarea.id, "insumo_quimico_id": quimico.id}, cantidad=0.25)
        tareas.append(tarea)

    return tareas
