from typing import List, Dict, Any
from sqlalchemy import delete, select, update, func
from sqlalchemy.orm import Session
from src.equipos.models import Equipo
from src.equipos import schemas, exceptions


# operaciones CRUD para Equipo


def crear_equipo(db: Session, equipo: schemas.EquipoCreate) -> schemas.Equipo:
    _equipo = Equipo(**equipo.model_dump())
    db.add(_equipo)
    db.commit()
    db.refresh(
        _equipo
    )  # <- qué hace refresh()?: https://docs.sqlalchemy.org/en/21/orm/session_api.html#sqlalchemy.orm.Session.refresh
    return _equipo


def listar_equipos(db: Session, page: int = 1, size: int = 10) -> Dict[str, Any]:

    skip = (page - 1) * size
    
    total = db.scalar(select(func.count()).select_from(Equipo))
    
    items = db.scalars(select(Equipo).offset(skip).limit(size)).all()
    
    pages = (total + size - 1) // size
    
    return {
        "items": items,
        "total": total,
        "page": page,
        "size": size,
        "pages": pages
    }


def leer_equipo(db: Session, equipo_id: int) -> schemas.Equipo:
    db_equipo = db.scalar(select(Equipo).where(Equipo.id == equipo_id))
    if db_equipo is None:
        raise exceptions.EquipoNoEncontrado() # <- usamos nuestras propias excepciones adaptadas al dominio de aplicación
    return db_equipo


def modificar_equipo(
    db: Session, equipo_id: int, equipo: schemas.EquipoUpdate
) -> Equipo:
    db_equipo = leer_equipo(db, equipo_id)
    db.execute(update(Equipo)
               .where(Equipo.id == equipo_id)
               .values(**equipo.model_dump()))
    db.commit()
    db.refresh(db_equipo)
    return db_equipo


def eliminar_equipo(db: Session, equipo_id: int) -> schemas.EquipoDelete:
    db_equipo = leer_equipo(db, equipo_id)
    db.execute(
        delete(Equipo).where(Equipo.id == equipo_id)
    )
    db.commit()
    return db_equipo
