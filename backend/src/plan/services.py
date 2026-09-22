from typing import Dict, Any
from sqlalchemy import select, func
from sqlalchemy.orm import Session
from src.plan.models import Plan
from src.tarea.models import Tarea
from src.sector.models import Sector
from src.equipos.models import Equipo
from src.plan import schemas, exceptions

def crear_plan(db: Session, plan_create: schemas.PlanCreate) -> Plan:
    # 1. Validar que las tareas existan
    tareas_db = db.scalars(select(Tarea).where(Tarea.id.in_(plan_create.tarea_ids))).all()
    if len(tareas_db) != len(plan_create.tarea_ids):
        raise exceptions.TareasNoEncontradas()
        

    if plan_create.sector_id is not None:
        sector_db = db.scalar(select(Sector).where(Sector.id == plan_create.sector_id))
        if not sector_db:
            raise ValueError("El sector indicado no existe.") 

    
    if plan_create.equipo_id is not None:
        equipo_db = db.scalar(select(Equipo).where(Equipo.id == plan_create.equipo_id))
        if not equipo_db:
            raise ValueError("El equipo indicado no existe.")

    
    nuevo_plan = Plan(
        nombre=plan_create.nombre,
        frecuencia=plan_create.frecuencia,
        responsable_id=plan_create.responsable_id,
        sector_id=plan_create.sector_id,
        equipo_id=plan_create.equipo_id,
    )
    
    nuevo_plan.tareas.extend(tareas_db)
    db.add(nuevo_plan)
    db.commit()
    db.refresh(nuevo_plan)
    return nuevo_plan

def listar_planes(db: Session, page: int = 1, size: int = 10, mostrar_inactivos: bool = False) -> Dict[str, Any]:
    skip = (page - 1) * size
    query = select(Plan)
    if not mostrar_inactivos:
        query = query.where(Plan.activo == True)

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

def leer_plan(db: Session, plan_id: int) -> Plan:
    plan_db = db.scalar(select(Plan).where(Plan.id == plan_id))
    if plan_db is None:
        raise exceptions.PlanNoEncontrado()
    return plan_db
