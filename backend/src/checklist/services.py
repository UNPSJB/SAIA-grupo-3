from datetime import date, timedelta
from typing import List
from sqlalchemy import select
from sqlalchemy.orm import Session
from src.personal.models import Personal
from src.plan.models import Plan
from src.checklist.models import ItemChecklist, EstadoItem
from src.checklist.periodos import periodos_entre
from src.checklist import schemas, exceptions
from datetime import datetime
from src.planRealizado.models import PlanRealizado
from src.tareaRealizada.models import TareaRealizada
from src.checklist.models import MovimientoItemChecklist, AccionMovimiento
from sqlalchemy import func
from src.exceptions import BadRequest
from src.consumoQuimico.models import ConsumoQuimico 
from src.insumosQuimicos.models import InsumoQuimico
from src.personal.services import leer_personal

def validar_operador(db: Session, personal_id: int) -> Personal:
    personal = db.get(Personal, personal_id)

    if personal is None or not personal.activo:
        raise exceptions.PersonalNoEncontrado()

    if not personal.operar:
        raise exceptions.PersonalSinPermisoOperar()

    return personal


def _items_abiertos(
    db: Session,
    plan_id: int,
    hoy: date,
) -> List[ItemChecklist]:
    return db.scalars(
        select(ItemChecklist).where(
            ItemChecklist.plan_id == plan_id,
            ItemChecklist.estado == EstadoItem.PENDIENTE,
            ItemChecklist.periodo_fin >= hoy,
        )
    ).all()


def _ultimo_item(
    db: Session,
    plan_id: int,
    tarea_id: int,
) -> ItemChecklist | None:
    return db.scalar(
        select(ItemChecklist)
        .where(
            ItemChecklist.plan_id == plan_id,
            ItemChecklist.tarea_id == tarea_id,
        )
        .order_by(ItemChecklist.periodo_fin.desc())
        .limit(1)
    )


def sincronizar_plan(db: Session, plan: Plan, hoy: date) -> None:
    tareas_actuales = {tarea.id: tarea for tarea in plan.tareas}

    for item in _items_abiertos(db, plan.id, hoy):
        tarea = tareas_actuales.get(item.tarea_id)
        sigue_vigente = (
            plan.activo
            and tarea is not None
            and tarea.frecuencia == item.frecuencia
        )

        if not sigue_vigente:
            db.delete(item)
        else:
            item.responsable_id = plan.responsable_id

    if not plan.activo:
        return

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

        for periodo_inicio, periodo_fin in periodos_entre(
            tarea.frecuencia,
            desde,
            hoy,
        ):
            db.add(
                ItemChecklist(
                    plan_id=plan.id,
                    tarea_id=tarea.id,
                    responsable_id=plan.responsable_id,
                    frecuencia=tarea.frecuencia,
                    periodo_inicio=periodo_inicio,
                    periodo_fin=periodo_fin,
                    estado=EstadoItem.PENDIENTE,
                )
            )

    db.flush()


def armar_checklist(db: Session,personal_id: int,hoy: date) -> schemas.Checklist:
    personal = validar_operador(db, personal_id)

    planes = db.scalars(
        select(Plan).where(
            Plan.responsable_id == personal_id,
            Plan.activo == True,
        )
    ).all()

    planes_con_items = db.scalars(
        select(Plan)
        .join(ItemChecklist, ItemChecklist.plan_id == Plan.id)
        .where(
            ItemChecklist.responsable_id == personal_id,
            ItemChecklist.periodo_fin >= hoy,
        )
        .distinct()
    ).all()

    planes_para_sincronizar = {
        plan.id: plan for plan in [*planes, *planes_con_items]
    }

    for plan in planes_para_sincronizar.values():
        sincronizar_plan(db, plan, hoy)

    db.commit()

    items = []

    for plan in planes:
        tareas_actuales = {tarea.id: tarea for tarea in plan.tareas}

        items_del_plan = db.scalars(
            select(ItemChecklist).where(
                ItemChecklist.plan_id == plan.id,
                ItemChecklist.periodo_inicio <= hoy,
                ItemChecklist.periodo_fin >= hoy,
            )
        ).all()

        items.extend(
            item
            for item in items_del_plan
            if item.tarea_id in tareas_actuales
            and item.frecuencia == tareas_actuales[item.tarea_id].frecuencia
        )

    items.sort(
        key=lambda item: (
            item.estado == EstadoItem.REALIZADA,
            item.plan.nombre,
            item.tarea.nombre,
        )
    )

    realizadas = sum(
        item.estado == EstadoItem.REALIZADA
        for item in items
    )

    return schemas.Checklist(
        fecha=hoy,
        responsable=personal,
        items=items,
        total=len(items),
        realizadas=realizadas,
        pendientes=len(items) - realizadas,
    )

def finalizar_item_checklist(
    db: Session,
    item_id: int,
    personal_id: int,
    foto_path: str | None = None,
    consumos: List[schemas.InsumoQuimicoConsumido] | None = None,
) -> ItemChecklist:
    item = db.get(ItemChecklist, item_id)

    if not item:
        raise exceptions.NotFound()

    # Evita que un operario finalice una tarea asignada a otra persona.
    if item.responsable_id != personal_id:
        from src.exceptions import PermissionDenied
        raise PermissionDenied()

    if item.estado == EstadoItem.REALIZADA:
        raise exceptions.BadRequest("La tarea ya se encuentra realizada.")

    consumos = consumos or []

    ids_enviados = [consumo.insumo_quimico_id for consumo in consumos]
    ids_configurados = {
        requisito.insumo_quimico_id
        for requisito in item.tarea.insumos_quimicos
    }

    if len(ids_enviados) != len(set(ids_enviados)):
        raise BadRequest(
            detail="Hay insumos químicos duplicados en el consumo."
        )

    if set(ids_enviados) != ids_configurados:
        raise BadRequest(
            detail=(
                "Informá el consumo de todos los productos "
                "configurados para esta tarea."
            )
        )

    cantidades_por_insumo = {
        consumo.insumo_quimico_id: consumo.cantidad_utilizada
        for consumo in consumos
    }

    # Valida el stock antes de marcar la tarea como realizada.
    errores_stock = []
    insumos_a_descontar = []

    for requisito in item.tarea.insumos_quimicos:
        insumo_db = db.get(
            InsumoQuimico,
            requisito.insumo_quimico_id,
        )

        if insumo_db is None:
            raise BadRequest(
                detail=(
                    "No se encontró el insumo químico "
                    f"{requisito.insumo_quimico_id}."
                )
            )

        cantidad_usada = cantidades_por_insumo[
            requisito.insumo_quimico_id
        ]

        if cantidad_usada > insumo_db.cantidad:
            errores_stock.append(
                f"'{insumo_db.nombre}' "
                f"(necesitás {cantidad_usada}, hay {insumo_db.cantidad})"
            )
        elif cantidad_usada > 0:
            insumos_a_descontar.append(
                (insumo_db, cantidad_usada)
            )

    if errores_stock:
        raise BadRequest(
            detail="Stock insuficiente de insumos: "
            + " / ".join(errores_stock)
        )

    ahora = datetime.now()
    hoy = ahora.date()

    item.estado = EstadoItem.REALIZADA
    item.realizada_por_id = personal_id
    item.realizada_en = ahora
    item.foto_path = foto_path

    db.add(
        MovimientoItemChecklist(
            item_id=item.id,
            accion=AccionMovimiento.REALIZADA,
            personal_id=personal_id,
            fecha_hora=ahora,
            foto_path=foto_path,
        )
    )

    plan_realizado = db.scalar(
        select(PlanRealizado).where(
            PlanRealizado.plan_origen_id == item.plan_id,
            func.date(PlanRealizado.fecha_ejecucion) == hoy,
        )
    )

    if not plan_realizado:
        plan_realizado = PlanRealizado(
            plan_origen_id=item.plan.id,
            nombre=item.plan.nombre,
            descripcion=item.plan.descripcion,
            responsable_id=item.plan.responsable_id,
            fecha_ejecucion=ahora,
            sector_id=item.plan.sector_id,
            equipo_id=item.plan.equipo_id,
        )
        db.add(plan_realizado)
        db.flush()

    tarea_realizada = TareaRealizada(
        plan_realizado_id=plan_realizado.id,
        tarea_origen_id=item.tarea.id,
        nombre=item.tarea.nombre,
        frecuencia=item.tarea.frecuencia,
        procedimiento=item.tarea.procedimiento,
        fecha_registro=ahora,
        foto_path=foto_path,
        equipo_id=item.tarea.equipo_id,
        elementos_utilizados=[
            {"id": elemento.id, "nombre": elemento.nombre}
            for elemento in item.tarea.elementos
        ],
        insumos_utilizados=[
            {
                "id": requisito.insumo_quimico_id,
                "cantidad": cantidades_por_insumo[
                    requisito.insumo_quimico_id
                ],
            }
            for requisito in item.tarea.insumos_quimicos
        ],
    )
    db.add(tarea_realizada)

    for insumo_db, cantidad_usada in insumos_a_descontar:
        insumo_db.cantidad -= cantidad_usada

        db.add(
            ConsumoQuimico(
                insumo_quimico_id=insumo_db.id,
                cantidad_utilizada=cantidad_usada,
                fecha=hoy,
                tarea_limpieza=item.tarea.nombre,
                operario_id=personal_id,
                activo=True,
            )
        )

    db.commit()
    db.refresh(item)
    return item