from typing import Dict, Any
from sqlalchemy import delete, select, update, func
from sqlalchemy.orm import Session
from src.tarea.models import Tarea
from src.elementos.models import Elemento
from src.insumos.models import Insumo
from src.tarea import schemas, exceptions

def crear_tarea(db: Session, tarea: schemas.TareaCreate) -> Tarea:
    elementos_db = db.scalars(select(Elemento).where(Elemento.id.in_(tarea.elemento_ids))).all() if tarea.elemento_ids else []
    insumos_db = db.scalars(select(Insumo).where(Insumo.id.in_(tarea.insumo_ids))).all() if tarea.insumo_ids else []

    nueva_tarea = Tarea(
        nombre=tarea.nombre,
        frecuencia=tarea.frecuencia,
        procedimiento=tarea.procedimiento,
        equipo_id=tarea.equipo_id
    )
    
    nueva_tarea.elementos.extend(elementos_db)
    nueva_tarea.insumos.extend(insumos_db)
    
    db.add(nueva_tarea)
    db.commit()
    db.refresh(nueva_tarea)
    return nueva_tarea

def listar_tareas(db: Session, page: int = 1, size: int = 10) -> Dict[str, Any]:
    skip = (page - 1) * size
    total = db.scalar(select(func.count()).select_from(Tarea))
    items = db.scalars(select(Tarea).offset(skip).limit(size)).all()
    pages = (total + size - 1) // size if total else 0
    return {
        "items": items,
        "total": total,
        "page": page,
        "size": size,
        "pages": pages
    }

def leer_tarea(db: Session, tarea_id: int) -> Tarea:
    db_tarea = db.scalar(select(Tarea).where(Tarea.id == tarea_id))
    if db_tarea is None:
        raise exceptions.TareaNoEncontrada()
    return db_tarea

def modificar_tarea(db: Session, tarea_id: int, tarea: schemas.TareaUpdate) -> Tarea:
    db_tarea = leer_tarea(db, tarea_id)
    datos_actualizar = tarea.model_dump(exclude_unset=True, exclude={'elemento_ids', 'insumo_ids'})
    
    if datos_actualizar:
        db.execute(update(Tarea).where(Tarea.id == tarea_id).values(**datos_actualizar))

    if tarea.elemento_ids is not None:
        elementos_db = db.scalars(select(Elemento).where(Elemento.id.in_(tarea.elemento_ids))).all()
        db_tarea.elementos = list(elementos_db)
        
    if tarea.insumo_ids is not None:
        insumos_db = db.scalars(select(Insumo).where(Insumo.id.in_(tarea.insumo_ids))).all()
        db_tarea.insumos = list(insumos_db)

    db.commit()
    db.refresh(db_tarea)
    return db_tarea

def eliminar_tarea(db: Session, tarea_id: int) -> schemas.TareaDelete:
    db_tarea = leer_tarea(db, tarea_id)
    db.execute(delete(Tarea).where(Tarea.id == tarea_id))
    db.commit()
    return db_tarea