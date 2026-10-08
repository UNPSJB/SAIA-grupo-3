from dataclasses import dataclass
from datetime import date, timedelta
from typing import Any, Dict, List, Set
from sqlalchemy import String, cast, func, or_, select
from sqlalchemy.orm import Session
from src.documentacion.constants import DIAS_AVISO_VENCIMIENTO, EstadoVencimiento
from src.documentacion.models import Documentacion
from src.personal.models import Personal
from src.tipoDocumento.models import TipoDocumento

# Se re-exporta DIAS_AVISO_VENCIMIENTO desde acá porque notificaciones lo importa de este módulo.
__all__ = [
    "DIAS_AVISO_VENCIMIENTO",
    "Vencimiento",
    "buscar_vencimientos",
    "dnis_con_vencimientos",
    "calcular_estado",
    "listar_vencimientos",
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
    personal_dni: int
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
        .join(Personal, Personal.dni == Documentacion.personal_id)
        .where(
            Documentacion.fecha_vencimiento.is_not(None),
            Documentacion.fecha_vencimiento <= limite,   # incluye los ya vencidos
            Personal.activo == True,
        )
    ).all()

    return [
        Vencimiento(documento_id=doc_id, personal_dni=dni, fecha_vencimiento=fecha)
        for doc_id, dni, fecha in filas
    ]


def dnis_con_vencimientos(db: Session, hoy: date | None = None) -> Set[int]:
    return {v.personal_dni for v in buscar_vencimientos(db, hoy)}


def listar_vencimientos(
    db: Session,
    page: int = 1,
    size: int = 10,
    estado: EstadoVencimiento | None = None,
    buscar: str = "",
    ordenar_por: str = "fecha_vencimiento",
    orden: str = "asc",
    hoy: date | None = None,
) -> Dict[str, Any]:
    """Listado paginado de vencimientos de documentación del personal activo."""
    hoy = hoy or date.today()
    limite = hoy + timedelta(days=DIAS_AVISO_VENCIMIENTO)
    skip = (page - 1) * size

    query = (
        select(Documentacion)
        .join(Personal, Personal.dni == Documentacion.personal_id)
        .join(TipoDocumento, TipoDocumento.id == Documentacion.tipo_documento_id)
        .where(
            Documentacion.fecha_vencimiento.is_not(None),
            Personal.activo == True,
        )
    )

    # Filtro por estado (se traduce a rangos de fecha para resolverlo en la consulta)
    if estado == EstadoVencimiento.VENCIDO:
        query = query.where(Documentacion.fecha_vencimiento < hoy)
    elif estado == EstadoVencimiento.POR_VENCER:
        query = query.where(Documentacion.fecha_vencimiento.between(hoy, limite))
    elif estado == EstadoVencimiento.VIGENTE:
        query = query.where(Documentacion.fecha_vencimiento > limite)

    # Búsqueda por apellido, nombre, DNI o tipo de documento
    if buscar.strip():
        termino = f"%{buscar.strip().lower()}%"
        query = query.where(
            or_(
                func.lower(Personal.apellido).like(termino),
                func.lower(Personal.nombre).like(termino),
                cast(Personal.dni, String).like(termino),
                func.lower(TipoDocumento.nombre).like(termino),
            )
        )

    # Lógica de ordenamiento
    columna_orden = COLUMNAS_ORDEN.get(ordenar_por, Documentacion.fecha_vencimiento)
    if orden == "desc":
        query = query.order_by(columna_orden.desc(), Documentacion.id.asc())
    else:
        query = query.order_by(columna_orden.asc(), Documentacion.id.asc())

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
