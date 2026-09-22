from typing import Dict, Any
from sqlalchemy import delete, select, update, func
from sqlalchemy.orm import Session
from src.tarea.models import Tarea
from src.tarea import schemas, exceptions

def crear_tarea(db: Session, tarea: schemas.TareaCreate) -> schemas.Tarea:
    _tarea = Tarea(**tarea.model_dump())
    db.add(_tarea)
    db.commit()
    db.refresh(_tarea)
    return _tarea

def listar_tareas(db: Session, page: int = 1, size: int = 10) -> Dict[str, Any]:
    skip = (page - 1) * size
    total = db.scalar(select(func.count()).select_from(Tarea))
    items = db.scalars(select(Tarea).offset(skip).limit(size)).all()
    pages = (total + size - 1) // size
    return {
        "items": items,
        "total": total,
        "page": page,
        "size": size,
        "pages": pages
    }

def leer_tarea(db: Session, tarea_id: int) -> schemas.Tarea:
    db_tarea = db.scalar(select(Tarea).where(Tarea.id == tarea_id))
    if db_tarea is None:
        raise exceptions.TareaNoEncontrada()
    return db_tarea

def modificar_tarea(db: Session, tarea_id: int, tarea: schemas.TareaUpdate) -> Tarea:
    db_tarea = leer_tarea(db, tarea_id)
    db.execute(update(Tarea).where(Tarea.id == tarea_id).values(**tarea.model_dump(exclude_unset=True)))
    db.commit()
    db.refresh(db_tarea)
    return db_tarea

def eliminar_tarea(db: Session, tarea_id: int) -> schemas.TareaDelete:
    db_tarea = leer_tarea(db, tarea_id)
    db.execute(delete(Tarea).where(Tarea.id == tarea_id))
    db.commit()
    return db_tarea