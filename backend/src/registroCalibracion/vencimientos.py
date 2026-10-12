from datetime import date, timedelta
from typing import Any, Dict
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session
from src.documentacion.constants import DIAS_AVISO_VENCIMIENTO, EstadoVencimiento
from src.documentacion.vencimientos import calcular_estado
from src.equipos.models import Equipo
from src.sector.models import Sector

# Usamos el mismo criterio que los vencimientos de personal (vencido / por vencer a
# DIAS_AVISO_VENCIMIENTO días / vigente) para que las dos vistas se comporten igual.
__all__ = ["DIAS_AVISO_VENCIMIENTO", "listar_vencimientos_calibracion"]

# Columnas por las que el listado permite ordenar (clave que manda el front -> valor de la fila)
COLUMNAS_ORDEN = {
    "fecha_vencimiento": lambda fila: fila["fecha_vencimiento"],
    "equipo": lambda fila: fila["equipo"].nombre.lower(),
    "numero_serie": lambda fila: fila["equipo"].numero_serie.lower(),
    "sector": lambda fila: (fila["sector"].nombre.lower() if fila["sector"] else ""),
}


def _fecha_vencimiento(equipo: Equipo) -> date:
    return equipo.fecha_ultima_calibracion + timedelta(days=equipo.periodicidad_dias)


def listar_vencimientos_calibracion(
    db: Session,
    page: int = 1,
    size: int = 10,
    estado: EstadoVencimiento | None = None,
    buscar: str = "",
    ordenar_por: str = "fecha_vencimiento",
    orden: str = "asc",
    hoy: date | None = None,
) -> Dict[str, Any]:
    """Listado paginado del próximo vencimiento de calibración de cada equipo activo.

    El vencimiento es fecha_ultima_calibracion + periodicidad_dias del equipo (el mismo
    cálculo que muestra el detalle del equipo). Solo entran los equipos que tienen
    ambos datos cargados.
    """
    hoy = hoy or date.today()
    skip = (page - 1) * size

    query = (
        select(Equipo)
        .outerjoin(Sector, Sector.id == Equipo.sector_id)
        .where(
            Equipo.activo == True,
            Equipo.fecha_ultima_calibracion.is_not(None),
            Equipo.periodicidad_dias.is_not(None),
            Equipo.periodicidad_dias > 0,
        )
    )

    # Búsqueda por nombre del equipo, número de serie o sector
    if buscar.strip():
        termino = f"%{buscar.strip().lower()}%"
        query = query.where(
            or_(
                func.lower(Equipo.nombre).like(termino),
                func.lower(Equipo.numero_serie).like(termino),
                func.lower(Sector.nombre).like(termino),
            )
        )


    filas = []
    for equipo in db.scalars(query).all():
        vencimiento = _fecha_vencimiento(equipo)
        estado_equipo = calcular_estado(vencimiento, hoy)
        if estado is not None and estado_equipo != estado:
            continue
        filas.append({
            "id": equipo.id,
            "fecha_vencimiento": vencimiento,
            "fecha_ultima_calibracion": equipo.fecha_ultima_calibracion,
            "periodicidad_dias": equipo.periodicidad_dias,
            "equipo": equipo,
            "sector": equipo.sector,
            "estado": estado_equipo,
            "dias_restantes": (vencimiento - hoy).days,
        })


    clave_orden = COLUMNAS_ORDEN.get(ordenar_por, COLUMNAS_ORDEN["fecha_vencimiento"])
    filas.sort(key=lambda fila: fila["id"])
    filas.sort(key=clave_orden, reverse=(orden == "desc"))

    total = len(filas)
    items = filas[skip: skip + size]
    pages = (total + size - 1) // size if total else 0

    return {"items": items, "total": total, "page": page, "size": size, "pages": pages}
