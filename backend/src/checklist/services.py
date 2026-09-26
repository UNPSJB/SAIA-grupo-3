from datetime import date, timedelta
from typing import List
from sqlalchemy import select
from sqlalchemy.orm import Session
from src.personal.models import Personal, TipoCapacidad
from src.plan.models import Plan
from src.checklist.models import ItemChecklist, EstadoItem
from src.checklist.periodos import periodos_entre
from src.checklist import schemas, exceptions

CAPACIDADES_OPERAR = (TipoCapacidad.OPERAR, TipoCapacidad.OPERAR_ADMINISTRAR)

def validar_operador(db: Session, personal_dni: int) -> Personal:
    personal = db.get(Personal, personal_dni)
    if personal is None or not personal.activo:
        raise exceptions.PersonalNoEncontrado()
    if personal.tipo_capacidad not in CAPACIDADES_OPERAR:
        raise exceptions.PersonalSinPermisoOperar()
    return personal

def _items_abiertos(db: Session, plan_id: int, hoy: date) -> List[ItemChecklist]:
    """Ítems pendientes del plan cuyo período todavía no terminó."""
    return db.scalars(
        select(ItemChecklist).where(
            ItemChecklist.plan_id == plan_id,
            ItemChecklist.estado == EstadoItem.PENDIENTE,
            ItemChecklist.periodo_fin >= hoy,
        )
    ).all()

def _ultimo_item(db: Session, plan_id: int, tarea_id: int) -> ItemChecklist | None:
    return db.scalar(
        select(ItemChecklist)
        .where(ItemChecklist.plan_id == plan_id, ItemChecklist.tarea_id == tarea_id)
        .order_by(ItemChecklist.periodo_fin.desc())
        .limit(1)
    )

def sincronizar_plan(db: Session, plan: Plan, hoy: date) -> None:
    tareas_actuales = {tarea.id: tarea for tarea in plan.tareas}

    # 1) Período en curso: ajustar los ítems pendientes a como está el plan hoy.
    for item in _items_abiertos(db, plan.id, hoy):
        tarea = tareas_actuales.get(item.tarea_id)
        sigue_vigente = plan.activo and tarea is not None and tarea.frecuencia == item.frecuencia
        if not sigue_vigente:
            db.delete(item)
        else:
            item.responsable_dni = plan.responsable_id

    if not plan.activo:
        return

    # 2) Generar los ítems que falten, desde el último generado (o el inicio del plan) hasta hoy.
    inicio_plan = plan.fecha_inicio or hoy
    for tarea in plan.tareas:
        ultimo = _ultimo_item(db, plan.id, tarea.id)
        if ultimo is None:
            desde = inicio_plan
        elif ultimo.frecuencia != tarea.frecuencia:
            desde = hoy
        else:
            desde = ultimo.periodo_fin + timedelta(days=1)
        desde = max(desde, inicio_plan)

        for periodo_inicio, periodo_fin in periodos_entre(tarea.frecuencia, desde, hoy):
            db.add(ItemChecklist(
                plan_id=plan.id,
                tarea_id=tarea.id,
                responsable_dni=plan.responsable_id,
                frecuencia=tarea.frecuencia,
                periodo_inicio=periodo_inicio,
                periodo_fin=periodo_fin,
                estado=EstadoItem.PENDIENTE,
            ))
    db.flush()

def armar_checklist(db: Session, personal_dni: int, hoy: date) -> schemas.Checklist:
    personal = validar_operador(db, personal_dni)

    planes = db.scalars(select(Plan).where(Plan.responsable_id == personal_dni, Plan.activo == True)).all()
    # También los planes donde tenía ítems abiertos, por si se lo quitaron o se dio de baja el plan.
    planes_con_items = db.scalars(
        select(Plan).join(ItemChecklist, ItemChecklist.plan_id == Plan.id).where(
            ItemChecklist.responsable_dni == personal_dni,
            ItemChecklist.periodo_fin >= hoy,
        ).distinct()
    ).all()
    for plan in {p.id: p for p in [*planes, *planes_con_items]}.values():
        sincronizar_plan(db, plan, hoy)
    db.commit()

    items = []
    for plan in planes:
        tareas_actuales = {tarea.id: tarea for tarea in plan.tareas}
        items_plan = db.scalars(
            select(ItemChecklist).where(
                ItemChecklist.plan_id == plan.id,
                ItemChecklist.periodo_inicio <= hoy,
                ItemChecklist.periodo_fin >= hoy,
            )
        ).all()
        items += [
            item for item in items_plan
            if item.tarea_id in tareas_actuales and item.frecuencia == tareas_actuales[item.tarea_id].frecuencia
        ]

    # Primero las pendientes, después por plan y por tarea.
    items.sort(key=lambda i: (i.estado == EstadoItem.REALIZADA, i.plan.nombre, i.tarea.nombre))
    realizadas = sum(1 for i in items if i.estado == EstadoItem.REALIZADA)

    return schemas.Checklist(
        fecha=hoy,
        responsable=personal,
        items=items,
        total=len(items),
        realizadas=realizadas,
        pendientes=len(items) - realizadas,
    )
