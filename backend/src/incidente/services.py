from typing import Any, Dict

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from src.incidente import exceptions, models, schemas
from src.personal.models import Personal


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


def crear_incidente(
    db: Session,
    incidente: schemas.IncidenteCreate,
    imagen_path: str | None = None,
) -> models.Incidente:
    validar_reportante(db, incidente.reportado_por_dni)
    db_incidente = models.Incidente(
        descripcion=incidente.descripcion,
        reportado_por_dni=incidente.reportado_por_dni,
        imagen_path=imagen_path,
    )
    db.add(db_incidente)
    db.commit()
    db.refresh(db_incidente)
    return db_incidente


def listar_incidentes(db: Session, page: int = 1, size: int = 10) -> Dict[str, Any]:
    skip = (page - 1) * size
    query = select(models.Incidente).order_by(models.Incidente.fecha_hora.desc())
    total = db.scalar(select(func.count()).select_from(query.subquery()))
    items = db.scalars(query.offset(skip).limit(size)).all()
    pages = (total + size - 1) // size if total else 0
    return {"items": items, "total": total, "page": page, "size": size, "pages": pages}


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
    db_incidente.descripcion = incidente.descripcion
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
