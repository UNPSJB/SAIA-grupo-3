from typing import Dict, Any
from sqlalchemy import select, func, delete
from sqlalchemy.orm import Session
from src.tareaRealizada.models import TareaRealizada
from src.tareaRealizada import exceptions

def listar_tareas_realizadas(db: Session, page: int = 1, size: int = 10) -> Dict[str, Any]:
    skip = (page - 1) * size
    query = select(TareaRealizada).order_by(TareaRealizada.fecha_registro.desc())
    
    total = db.scalar(select(func.count()).select_from(query.subquery()))
    items = db.scalars(query.offset(skip).limit(size)).all()
    pages = (total + size - 1) // size if total else 0

    return {
        "items": items,
        "total": total,
        "page": page,
        "size": size,
        "pages": pages
    }

def leer_tarea_realizada(db: Session, tarea_realizada_id: int) -> TareaRealizada:
    db_tarea = db.scalar(select(TareaRealizada).where(TareaRealizada.id == tarea_realizada_id))
    if db_tarea is None:
        raise exceptions.TareaRealizadaNoEncontrada()
    return db_tarea

def eliminar_tarea_realizada(db: Session, tarea_realizada_id: int) -> TareaRealizada:
    db_tarea = leer_tarea_realizada(db, tarea_realizada_id)
    db.execute(delete(TareaRealizada).where(TareaRealizada.id == tarea_realizada_id))
    db.commit()
    return db_tarea