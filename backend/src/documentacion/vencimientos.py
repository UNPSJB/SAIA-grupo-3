from dataclasses import dataclass
from datetime import date, timedelta
from typing import Any, Dict, List, Literal, Set
from sqlalchemy import func, select
from src.pagination import filtrar_ordenar
from sqlalchemy.orm import Session
from src.documentacion.constants import DIAS_AVISO_VENCIMIENTO, EstadoVencimiento
from src.documentacion.models import Documentacion
from src.equipos.models import Equipo
from src.personal.models import Personal
from src.sector.models import Sector
from src.tipoDocumento.models import TipoDocumento

# Se re-exporta DIAS_AVISO_VENCIMIENTO desde acá porque notificaciones lo importa de este módulo.
__all__ = [
    "DIAS_AVISO_VENCIMIENTO",
    "Vencimiento",
    "buscar_vencimientos",
    "ids_con_vencimientos",
    "calcular_estado",
    "listar_vencimientos",
    "listar_vencimientos_consolidados",
]

# Columnas por las que el listado permite ordenar (clave que manda el front -> columna real)
COLUMNAS_ORDEN = {
    "fecha_vencimiento": Documentacion.fecha_vencimiento,
    "empleado": Personal.apellido,
    "dni": Personal.dni,
    "tipo_documento": TipoDocumento.nombre,
}


@dataclass
class Vencimiento:
    documento_id: int
    personal_id: int
    fecha_vencimiento: date


def calcular_estado(fecha_vencimiento: date, hoy: date) -> EstadoVencimiento:
    if fecha_vencimiento < hoy:
        return EstadoVencimiento.VENCIDO
    if fecha_vencimiento <= hoy + timedelta(days=DIAS_AVISO_VENCIMIENTO):
        return EstadoVencimiento.POR_VENCER
    return EstadoVencimiento.VIGENTE


def buscar_vencimientos(db: Session, hoy: date | None = None) -> List[Vencimiento]:
    """Documentos vencidos o por vencer del personal activo (lo usa la campanita)."""
    hoy = hoy or date.today()
    limite = hoy + timedelta(days=DIAS_AVISO_VENCIMIENTO)

    filas = db.execute(
        select(Documentacion.id, Documentacion.personal_id, Documentacion.fecha_vencimiento)
        .join(Personal, Personal.id == Documentacion.personal_id)
        .where(
            Documentacion.fecha_vencimiento.is_not(None),
            Documentacion.fecha_vencimiento <= limite,   # incluye los ya vencidos
            Personal.activo == True,
        )
    ).all()

    return [
        Vencimiento(documento_id=doc_id, personal_id=dni, fecha_vencimiento=fecha)
        for doc_id, dni, fecha in filas
    ]


def ids_con_vencimientos(db: Session, hoy: date | None = None) -> Set[int]:
    return {v.personal_id for v in buscar_vencimientos(db, hoy)}


def listar_vencimientos(
    db: Session,
    page: int = 1,
    size: int = 10,
    estado: EstadoVencimiento | None = None,
    buscar: str = "",
    ordenar_por: str = "fecha_vencimiento",
    orden: str = "asc",
    hoy: date | None = None,
    solo_alertas: bool = False,
) -> Dict[str, Any]:
    """Listado paginado de vencimientos de documentación del personal activo."""
    hoy = hoy or date.today()
    limite = hoy + timedelta(days=DIAS_AVISO_VENCIMIENTO)
    skip = (page - 1) * size

    query = (
        select(Documentacion)
        .join(Personal, Personal.id == Documentacion.personal_id)
        .join(TipoDocumento, TipoDocumento.id == Documentacion.tipo_documento_id)
        .where(
            Documentacion.fecha_vencimiento.is_not(None),
            Personal.activo == True,
        )
    )

    if solo_alertas:
        query = query.where(Documentacion.fecha_vencimiento <= limite)

    # Filtro por estado (se traduce a rangos de fecha para resolverlo en la consulta)
    if estado == EstadoVencimiento.VENCIDO:
        query = query.where(Documentacion.fecha_vencimiento < hoy)
    elif estado == EstadoVencimiento.POR_VENCER:
        query = query.where(Documentacion.fecha_vencimiento.between(hoy, limite))
    elif estado == EstadoVencimiento.VIGENTE:
        query = query.where(Documentacion.fecha_vencimiento > limite)

    query = filtrar_ordenar(query, Documentacion, buscar, [Personal.apellido, Personal.nombre, Personal.dni, TipoDocumento.nombre], ordenar_por, orden, COLUMNAS_ORDEN)

    total = db.scalar(select(func.count()).select_from(query.subquery()))
    documentos = db.scalars(query.offset(skip).limit(size)).all()
    pages = (total + size - 1) // size if total else 0

    items = [
        {
            "id": doc.id,
            "fecha_vencimiento": doc.fecha_vencimiento,
            "tipo_documento": doc.tipo_documento,
            "personal": doc.personal,
            "estado": calcular_estado(doc.fecha_vencimiento, hoy),
            "dias_restantes": (doc.fecha_vencimiento - hoy).days,
        }
        for doc in documentos
    ]

    return {"items": items, "total": total, "page": page, "size": size, "pages": pages}


def listar_vencimientos_consolidados(
    db: Session,
    page: int = 1,
    size: int = 10,
    origen: Literal["todos", "documentacion", "calibracion"] = "todos",
    estado: EstadoVencimiento | None = None,
    solo_alertas: bool = False,
    buscar: str = "",
    ordenar_por: Literal["fecha_vencimiento", "elemento"] = "fecha_vencimiento",
    orden: Literal["asc", "desc"] = "asc",
    hoy: date | None = None,
) -> Dict[str, Any]:
    """Lista vencimientos de documentos y calibraciones actuales en un orden común."""
    hoy = hoy or date.today()
    skip = (page - 1) * size
    filas: list[dict[str, Any]] = []

    if origen in ("todos", "documentacion"):
        documentos = db.scalars(
            select(Documentacion)
            .join(Personal, Personal.id == Documentacion.personal_id)
            .join(TipoDocumento, TipoDocumento.id == Documentacion.tipo_documento_id)
            .where(
                Documentacion.fecha_vencimiento.is_not(None),
                Personal.activo == True,
            )
        ).all()
        for documento in documentos:
            fecha_vencimiento = documento.fecha_vencimiento
            if fecha_vencimiento is None:
                continue
            filas.append(
                {
                    "id": documento.id,
                    "detalle_id": documento.personal.id,
                    "origen": "documentacion",
                    "fecha_vencimiento": fecha_vencimiento,
                    "tipo_documento": documento.tipo_documento,
                    "personal": documento.personal,
                    "estado": calcular_estado(fecha_vencimiento, hoy),
                    "dias_restantes": (fecha_vencimiento - hoy).days,
                }
            )

    if origen in ("todos", "calibracion"):
        equipos = db.scalars(
            select(Equipo)
            .outerjoin(Sector, Sector.id == Equipo.sector_id)
            .where(
                Equipo.activo == True,
                Equipo.fecha_ultima_calibracion.is_not(None),
                Equipo.periodicidad_dias.is_not(None),
                Equipo.periodicidad_dias > 0,
            )
        ).all()
        for equipo in equipos:
            fecha_ultima_calibracion = equipo.fecha_ultima_calibracion
            periodicidad_dias = equipo.periodicidad_dias
            if fecha_ultima_calibracion is None or periodicidad_dias is None:
                continue
            fecha_vencimiento = fecha_ultima_calibracion + timedelta(
                days=periodicidad_dias
            )
            filas.append(
                {
                    "id": equipo.id,
                    "detalle_id": equipo.id,
                    "origen": "calibracion",
                    "fecha_vencimiento": fecha_vencimiento,
                    "fecha_ultima_calibracion": fecha_ultima_calibracion,
                    "periodicidad_dias": periodicidad_dias,
                    "equipo": equipo,
                    "sector": equipo.sector,
                    "estado": calcular_estado(fecha_vencimiento, hoy),
                    "dias_restantes": (fecha_vencimiento - hoy).days,
                }
            )

    termino = buscar.strip().casefold()
    if solo_alertas:
        limite = hoy + timedelta(days=DIAS_AVISO_VENCIMIENTO)
        filas = [fila for fila in filas if fila["fecha_vencimiento"] <= limite]
    if estado is not None:
        filas = [fila for fila in filas if fila["estado"] == estado]
    if termino:
        def coincide(fila: dict[str, Any]) -> bool:
            if fila["origen"] == "documentacion":
                valores = (
                    fila["personal"].nombre,
                    fila["personal"].apellido,
                    fila["personal"].dni,
                    fila["tipo_documento"].nombre,
                )
            else:
                valores = (
                    fila["equipo"].nombre,
                    fila["equipo"].numero_serie,
                    fila["sector"].nombre if fila["sector"] else "",
                )
            return any(termino in valor.casefold() for valor in valores)

        filas = [fila for fila in filas if coincide(fila)]

    orden_origen = {"documentacion": 0, "calibracion": 1}
    filas.sort(key=lambda fila: (orden_origen[fila["origen"]], fila["id"]))
    filas.sort(
        key=lambda fila: (
            fila["fecha_vencimiento"]
            if ordenar_por == "fecha_vencimiento"
            else (
                f'{fila["personal"].apellido} {fila["personal"].nombre}'
                if fila["origen"] == "documentacion"
                else fila["equipo"].nombre
            ).casefold()
        ),
        reverse=orden == "desc",
    )

    total = len(filas)
    items = filas[skip : skip + size]
    pages = (total + size - 1) // size if total else 0
    return {"items": items, "total": total, "page": page, "size": size, "pages": pages}
