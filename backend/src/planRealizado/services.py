from src.pagination import filtrar_ordenar
from datetime import date
from typing import Dict, Any
from sqlalchemy import select, func, delete
from sqlalchemy.orm import Session
from src.planRealizado.models import PlanRealizado
from src.tareaRealizada.models import TareaRealizada
from src.planRealizado import schemas, exceptions

def crear_plan_realizado(db: Session, plan_create: schemas.PlanRealizadoCreate) -> PlanRealizado:

    nuevo_plan_realizado = PlanRealizado(
        plan_origen_id=plan_create.plan_origen_id,
        nombre=plan_create.nombre,
        descripcion=plan_create.descripcion,
        responsable_id=plan_create.responsable_id,
        sector_id=plan_create.sector_id,
        equipo_id=plan_create.equipo_id
    )
    

    for tarea_create in plan_create.tareas_realizadas:
        nueva_tarea = TareaRealizada(
            tarea_origen_id=tarea_create.tarea_origen_id,
            nombre=tarea_create.nombre,
            frecuencia=tarea_create.frecuencia,
            procedimiento=tarea_create.procedimiento,
            equipo_id=tarea_create.equipo_id,
            elementos_utilizados=tarea_create.elementos_utilizados,
            insumos_utilizados=tarea_create.insumos_utilizados
        )
        nuevo_plan_realizado.tareas_realizadas.append(nueva_tarea)
        
    db.add(nuevo_plan_realizado)
    db.commit()
    db.refresh(nuevo_plan_realizado)
    return nuevo_plan_realizado

def listar_planes_realizados(db: Session, page: int = 1, size: int = 10, desde: date | None = None, hasta: date | None = None, buscar: str = "", ordenar_por: str = "fecha_ejecucion", orden: str = "desc") -> Dict[str, Any]:
    skip = (page - 1) * size
    query = select(PlanRealizado).order_by(PlanRealizado.fecha_ejecucion.desc())

    if desde:
        query = query.where(func.date(PlanRealizado.fecha_ejecucion) >= desde)
    if hasta:
        query = query.where(func.date(PlanRealizado.fecha_ejecucion) <= hasta)
    
    query = filtrar_ordenar(query, PlanRealizado, buscar, [PlanRealizado.nombre, PlanRealizado.descripcion], ordenar_por, orden, {"id": PlanRealizado.id, "nombre": PlanRealizado.nombre, "fecha_ejecucion": PlanRealizado.fecha_ejecucion})
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

def leer_plan_realizado(db: Session, plan_realizado_id: int) -> PlanRealizado:
    db_plan = db.scalar(select(PlanRealizado).where(PlanRealizado.id == plan_realizado_id))
    if db_plan is None:
        raise exceptions.PlanRealizadoNoEncontrado()
    return db_plan

def eliminar_plan_realizado(db: Session, plan_realizado_id: int) -> PlanRealizado:
    db_plan = leer_plan_realizado(db, plan_realizado_id)
    # Se borrarán en cascada las tareas_realizadas asociadas gracias a "delete-orphan"
    db.execute(delete(PlanRealizado).where(PlanRealizado.id == plan_realizado_id))
    db.commit()
    return db_plan