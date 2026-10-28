from datetime import date, timedelta
from sqlalchemy import select, func
from sqlalchemy.orm import Session

from src.checklist.models import EstadoItem, ItemChecklist
from src.tablero import exceptions
from src.tablero.constants import DIAS_MAXIMOS_RANGO, DIAS_POR_DEFECTO, Agrupacion


def _inicio_del_grupo(dia: date, agrupacion: Agrupacion) -> date:
    if agrupacion == Agrupacion.SEMANA:
        return dia - timedelta(days=dia.weekday())
    return dia


def _fin_del_grupo(inicio: date, agrupacion: Agrupacion) -> date:
    if agrupacion == Agrupacion.SEMANA:
        return inicio + timedelta(days=6)
    return inicio


def _porcentaje(realizadas: int, total: int) -> float | None:
    return round(realizadas * 100 / total, 1) if total else None


def calcular_cumplimiento(db: Session, fecha_desde: date | None, fecha_hasta: date | None,
                          agrupacion: Agrupacion, hoy: date | None = None) -> dict:
    hoy = hoy or date.today()
    hasta = fecha_hasta or hoy
    desde = fecha_desde or hasta - timedelta(days=DIAS_POR_DEFECTO - 1)
    if desde > hasta:
        raise exceptions.RangoInvalido()
    if (hasta - desde).days >= DIAS_MAXIMOS_RANGO:
        raise exceptions.RangoDemasiadoGrande()

    ultimo_dia_cerrado = min(hasta, hoy - timedelta(days=1))
    filas = db.execute(
        select(ItemChecklist.periodo_fin, ItemChecklist.estado).where(
            ItemChecklist.periodo_fin >= desde,
            ItemChecklist.periodo_fin <= ultimo_dia_cerrado,
        )
    ).all()
    primera_fecha = db.scalar(select(func.min(ItemChecklist.periodo_fin)))

    conteo: dict[date, list[int]] = {}
    for periodo_fin, estado in filas:
        grupo = conteo.setdefault(_inicio_del_grupo(periodo_fin, agrupacion), [0, 0])
        grupo[0] += 1
        if estado == EstadoItem.REALIZADA:
            grupo[1] += 1

    puntos = []
    inicio = _inicio_del_grupo(desde, agrupacion)
    while inicio <= hasta:
        fin = _fin_del_grupo(inicio, agrupacion)
        total, realizadas = conteo.get(inicio, [0, 0])
        puntos.append({
            "inicio": max(inicio, desde),
            "fin": min(fin, hasta),
            "total": total,
            "realizadas": realizadas,
            "porcentaje": _porcentaje(realizadas, total),
        })
        inicio = fin + timedelta(days=1)

    total = sum(punto["total"] for punto in puntos)
    realizadas = sum(punto["realizadas"] for punto in puntos)
    return {
        "agrupacion": agrupacion,
        "desde": desde,
        "hasta": hasta,
        "total": total,
        "realizadas": realizadas,
        "porcentaje": _porcentaje(realizadas, total),
        "puntos": puntos,
        "primera_fecha": primera_fecha,
    }
