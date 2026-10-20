from src.pagination import filtrar_ordenar
from typing import Dict, Any
from datetime import date
from sqlalchemy import select, update, func
from sqlalchemy.orm import Session
from src.plan.models import Plan
from src.tarea.models import Tarea
from src.sector.models import Sector
from src.equipos.models import Equipo
from src.personal.models import Personal
from src.plan import schemas, exceptions

def _buscar_tareas(db: Session, tarea_ids: list[int]) -> list[Tarea]:
    """Devuelve las tareas indicadas. Error 400 si la lista está vacía o alguna no existe."""
    ids = set(tarea_ids)   # set: si un id viene repetido, cuenta una sola vez
    if not ids:
        raise exceptions.TareasRequeridas()
    tareas = db.scalars(select(Tarea).where(Tarea.id.in_(ids))).all()
    if len(tareas) != len(ids):
        raise exceptions.TareasNoEncontradas()
    return list(tareas)


def _validar_sector_y_equipo(db: Session, sector_id: int | None, equipo_id: int | None) -> None:
    """Error 400 si el sector o el equipo indicados no existen."""
    if sector_id is not None and db.get(Sector, sector_id) is None:
        raise exceptions.SectorNoExiste()
    if equipo_id is not None and db.get(Equipo, equipo_id) is None:
        raise exceptions.EquipoNoExiste()


def _validar_responsable(db: Session, responsable_id: int) -> None:
    """Error 400 si el responsable no existe, está dado de baja o no puede operar."""
    responsable = db.get(Personal, responsable_id)
    if responsable is None or not responsable.activo or not responsable.operar:
        raise exceptions.ResponsableNoValido()


def crear_plan(db: Session, plan_create: schemas.PlanCreate) -> Plan:
    tareas_db = _buscar_tareas(db, plan_create.tarea_ids)
    _validar_sector_y_equipo(db, plan_create.sector_id, plan_create.equipo_id)
    _validar_responsable(db, plan_create.responsable_id)

    nuevo_plan = Plan(
        nombre=plan_create.nombre,
        descripcion=plan_create.descripcion,
        responsable_id=plan_create.responsable_id,
        sector_id=plan_create.sector_id,
        equipo_id=plan_create.equipo_id,
        activo=True,
        fecha_inicio=date.today()
    )
    
    nuevo_plan.tareas.extend(tareas_db)
    db.add(nuevo_plan)
    db.commit()
    db.refresh(nuevo_plan)
    return nuevo_plan

def listar_planes(db: Session, page: int = 1, size: int = 10, mostrar_inactivos: bool = False, buscar: str = "", ordenar_por: str = "id", orden: str = "asc"
) -> Dict[str, Any]:
    skip = (page - 1) * size
    query = select(Plan)
    if not mostrar_inactivos:
        query = query.where(Plan.activo == True)

    query = filtrar_ordenar(query, Plan, buscar, [Plan.nombre, Plan.descripcion], ordenar_por, orden, {"id": Plan.id, "nombre": Plan.nombre, "descripcion": Plan.descripcion, "fecha_inicio": Plan.fecha_inicio, "fecha_fin": Plan.fecha_fin, "activo": Plan.activo})

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

def modificar_plan(db: Session, plan_id: int, plan_update: schemas.PlanUpdate) -> Plan:
    db_plan = leer_plan(db, plan_id)
    datos_actualizar = plan_update.model_dump(exclude_unset=True, exclude={"tarea_ids"})

    _validar_sector_y_equipo(db, datos_actualizar.get("sector_id"), datos_actualizar.get("equipo_id"))
    nuevo_responsable = datos_actualizar.get("responsable_id")
    if nuevo_responsable is not None and nuevo_responsable != db_plan.responsable_id:
        _validar_responsable(db, nuevo_responsable)
    tareas_db = _buscar_tareas(db, plan_update.tarea_ids) if plan_update.tarea_ids is not None else None

    if "activo" in datos_actualizar:
        if datos_actualizar["activo"] and not db_plan.activo:
            db_plan.fecha_inicio = date.today()
            db_plan.fecha_fin = None
        elif not datos_actualizar["activo"] and db_plan.activo:
            db_plan.fecha_fin = date.today()

    if datos_actualizar:
        db.execute(update(Plan).where(Plan.id == plan_id).values(**datos_actualizar))

    if tareas_db is not None:
        db_plan.tareas = tareas_db

    db.commit()
    db.refresh(db_plan)
    return db_plan

def eliminar_plan(db: Session, plan_id: int) -> Plan:
    db_plan = leer_plan(db, plan_id)
    db_plan.activo = False
    db_plan.fecha_fin = date.today()
    db.commit()
    db.refresh(db_plan)
    return db_plan
