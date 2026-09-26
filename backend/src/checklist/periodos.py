import calendar
from datetime import date, timedelta
from typing import List, Tuple
from src.tarea.models import FrecuenciaTarea

Periodo = Tuple[date, date]

def periodo_de(frecuencia: FrecuenciaTarea, fecha: date) -> Periodo:
    """Devuelve (inicio, fin) del período que contiene a `fecha` según la frecuencia.
    DIARIA: el mismo día. SEMANAL: de lunes a domingo. MENSUAL: del día 1 al último del mes."""
    if frecuencia == FrecuenciaTarea.DIARIA:
        return fecha, fecha
    if frecuencia == FrecuenciaTarea.SEMANAL:
        lunes = fecha - timedelta(days=fecha.weekday())
        return lunes, lunes + timedelta(days=6)
    if frecuencia == FrecuenciaTarea.MENSUAL:
        ultimo_dia = calendar.monthrange(fecha.year, fecha.month)[1]
        return fecha.replace(day=1), fecha.replace(day=ultimo_dia)
    raise ValueError(f"Frecuencia no soportada: {frecuencia}")

def periodos_entre(frecuencia: FrecuenciaTarea, desde: date, hasta: date) -> List[Periodo]:
    """Todos los períodos que se solapan con el rango [desde, hasta], en orden.
    Se usa para completar los períodos que nunca se generaron."""
    periodos = []
    fecha = desde
    while fecha <= hasta:
        inicio, fin = periodo_de(frecuencia, fecha)
        periodos.append((inicio, fin))
        fecha = fin + timedelta(days=1)
    return periodos
