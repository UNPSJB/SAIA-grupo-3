from src.pagination import filtrar_ordenar
from datetime import date, datetime, time, timedelta
from typing import Any, Dict

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from src.incidente import exceptions, models, schemas
from src.incidente.auditoria import (
    AccionMovimientoIncidente,
    MovimientoIncidente,
    registrar_movimiento,
)
from src.incidente.constants import EstadoIncidente
from src.personal.models import Personal
from src.tipoIncidente import exceptions as tipo_incidente_exceptions
from src.tipoIncidente.models import TipoIncidente


def validar_reportante(db: Session, personal_dni: str) -> Personal:
    reportante = db.scalar(
        select(Personal).where(
            Personal.dni == personal_dni,
            Personal.activo == True,
            Personal.operar == True,
        )
    )
    if reportante is None:
        raise exceptions.OperadorNoValido()
    return reportante


def _validar_tipo(
    db: Session, tipo_id: int, tipo_actual_id: int | None = None
) -> None:
    """El tipo debe existir; si está dado de baja, solo se acepta el que ya usa el incidente."""
    query = select(TipoIncidente).where(
        TipoIncidente.id == tipo_id,
        (TipoIncidente.activo == True) | (TipoIncidente.id == tipo_actual_id),
    )
    if db.scalar(query) is None:
        raise tipo_incidente_exceptions.TipoIncidenteNoEncontrado()


def crear_incidente(
    db: Session,
    incidente: schemas.IncidenteCreate,
    reportado_por_dni: str,
    imagen_path: str | None = None,
) -> models.Incidente:
    reportante = validar_reportante(db, reportado_por_dni)
    _validar_tipo(db, incidente.tipo_id)
    db_incidente = models.Incidente(
        descripcion=incidente.descripcion,
        tipo_id=incidente.tipo_id,
        reportado_por_dni=reportado_por_dni,
        imagen_path=imagen_path,
    )
    db.add(db_incidente)
    db.flush()  
    registrar_movimiento(
        db, db_incidente.id, AccionMovimientoIncidente.REPORTADO, reportante.id
    )
    db.commit()
    db.refresh(db_incidente)
    return db_incidente


def listar_incidentes(
    db: Session,
    page: int = 1,
    size: int = 10,
    buscar: str = "",
    ordenar_por: str = "fecha_hora",
    orden: str = "desc",
    reportado_por_dni: str | None = None,
    estado: EstadoIncidente | None = None,
    fecha_desde: date | None = None,
    fecha_hasta: date | None = None,
    tipo_id: int | None = None,
) -> Dict[str, Any]:
    skip = (page - 1) * size
    query = select(models.Incidente).order_by(models.Incidente.fecha_hora.desc())
    if reportado_por_dni is not None:
        query = query.where(models.Incidente.reportado_por_dni == reportado_por_dni)
    if estado is not None:
        query = query.where(models.Incidente.estado == estado)
    if tipo_id is not None:
        query = query.where(models.Incidente.tipo_id == tipo_id)
    if fecha_desde is not None:
        query = query.where(
            models.Incidente.fecha_hora >= datetime.combine(fecha_desde, time.min)
        )
    if fecha_hasta is not None:
        query = query.where(
            models.Incidente.fecha_hora
            < datetime.combine(fecha_hasta + timedelta(days=1), time.min)
        )
    query = filtrar_ordenar(query, models.Incidente, buscar, [models.Incidente.descripcion, models.Incidente.reportado_por_dni], ordenar_por, orden, {"id": models.Incidente.id, "descripcion": models.Incidente.descripcion, "fecha_hora": models.Incidente.fecha_hora, "reportado_por_dni": models.Incidente.reportado_por_dni})
    total = db.scalar(select(func.count()).select_from(query.subquery()))
    items = db.scalars(query.offset(skip).limit(size)).all()
    pages = (total + size - 1) // size if total else 0
    return {"items": items, "total": total, "page": page, "size": size, "pages": pages}

def listar_incidentes_abiertos(
    db: Session,
    page: int = 1,
    size: int = 10,
    tipo_id: int | None = None,
    dias_minimos: int | None = None,
    buscar: str = "",
    ordenar_por: str = "fecha_hora",
    orden: str = "asc",
) -> Dict[str, Any]:
    """Incidentes sin acción correctiva vigente (estado abierto), ordenable y filtrable."""
    skip = (page - 1) * size
    query = select(models.Incidente).where(models.Incidente.estado == EstadoIncidente.ABIERTO)

    if tipo_id is not None:
        query = query.where(models.Incidente.tipo_id == tipo_id)
    if dias_minimos is not None:
        limite = datetime.now() - timedelta(days=dias_minimos)
        query = query.where(models.Incidente.fecha_hora <= limite)

    query = filtrar_ordenar(
        query,
        models.Incidente,
        buscar,
        [models.Incidente.descripcion, models.Incidente.reportado_por_dni],
        ordenar_por,
        orden,
        {
            "id": models.Incidente.id,
            "descripcion": models.Incidente.descripcion,
            "fecha_hora": models.Incidente.fecha_hora,
            "reportado_por_dni": models.Incidente.reportado_por_dni,
        },
    )

    total = db.scalar(select(func.count()).select_from(query.subquery()))
    items = db.scalars(query.offset(skip).limit(size)).all()
    pages = (total + size - 1) // size if total else 0
    return {"items": items, "total": total, "page": page, "size": size, "pages": pages}


def contar_abiertos_por_tipo(db: Session) -> list[schemas.CantidadPorTipo]:
    """Incidentes abiertos de cada tipo del maestro (incluye tipos en 0, activos o
    dados de baja: nada debe desaparecer del tablero)."""
    filas = db.execute(
        select(TipoIncidente, func.count(models.Incidente.id))
        .outerjoin(
            models.Incidente,
            (models.Incidente.tipo_id == TipoIncidente.id)
            & (models.Incidente.estado == EstadoIncidente.ABIERTO),
        )
        .group_by(TipoIncidente.id)
        .order_by(TipoIncidente.id)
    ).all()
    return [
        schemas.CantidadPorTipo(tipo=tipo, cantidad=cantidad)
        for tipo, cantidad in filas
    ]


def leer_incidente(db: Session, incidente_id: int) -> models.Incidente:
    incidente = db.scalar(
        select(models.Incidente).where(models.Incidente.id == incidente_id)
    )
    if incidente is None:
        raise exceptions.IncidenteNoEncontrado()
    return incidente


def modificar_incidente(
    db: Session,
    incidente_id: int,
    incidente: schemas.IncidenteUpdate,
    imagen_path: str | None = None,
) -> models.Incidente:
    db_incidente = leer_incidente(db, incidente_id)
    _validar_tipo(db, incidente.tipo_id, tipo_actual_id=db_incidente.tipo_id)
    db_incidente.descripcion = incidente.descripcion
    db_incidente.tipo_id = incidente.tipo_id
    if incidente.estado is not None:
        db_incidente.estado = incidente.estado
    if imagen_path is not None:
        db_incidente.imagen_path = imagen_path
    db.commit()
    db.refresh(db_incidente)
    return db_incidente


def eliminar_incidente(db: Session, incidente_id: int) -> schemas.Incidente:
    incidente = leer_incidente(db, incidente_id)
    respuesta = schemas.Incidente.model_validate(incidente)
    db.delete(incidente)
    db.commit()
    return respuesta


def listar_movimientos(db: Session, incidente_id: int) -> list[MovimientoIncidente]:
    """Historial del incidente, del más antiguo al más reciente."""
    leer_incidente(db, incidente_id)
    return db.scalars(
        select(MovimientoIncidente)
        .where(MovimientoIncidente.incidente_id == incidente_id)
        .order_by(MovimientoIncidente.fecha_hora.asc(), MovimientoIncidente.id.asc())
    ).all()