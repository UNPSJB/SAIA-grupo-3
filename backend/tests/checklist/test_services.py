from datetime import date, datetime, timedelta

import pytest
from sqlalchemy import func, select

from src.checklist import services
from src.checklist.models import (
    AccionMovimiento,
    EstadoItem,
    ItemChecklist,
    MovimientoItemChecklist,
)
from src.checklist.periodos import periodo_de
from src.checklist.schemas import InsumoQuimicoConsumido
from src.consumoQuimico.models import ConsumoQuimico
from src.exceptions import BadRequest
from src.insumosQuimicos import services as quimicos
from src.insumosQuimicos.models import TipoQuimico
from src.insumosQuimicos.schemas import InsumoQuimicoCreate
from src.notificaciones import services as avisos
from src.notificaciones.models import Notificacion
from src.plan.models import Plan
from src.planRealizado.models import PlanRealizado
from src.tarea.models import FrecuenciaTarea, Tarea, TareaInsumoQuimico
from src.tareaRealizada.models import TareaRealizada
from tests.database import db_session, persona_operadora, unidad_medida  # noqa: F401


def crear_quimico(db, unidad, nombre="Detergente", cantidad=10, minimo=5):
    return quimicos.crear_insumo_quimico(
        db,
        InsumoQuimicoCreate(
            nombre=nombre,
            cantidad=cantidad,
            stock_minimo=minimo,
            tipo_quimico=TipoQuimico.DETERGENTE,
            unidad_medida_id=unidad.id,
        ),
    )


def crear_plan_con_tarea(
    db,
    responsable,
    *,
    frecuencia=FrecuenciaTarea.DIARIA,
    quimico=None,
    cantidad_quimico=5,
    fecha_inicio=None,
    activo=True,
    nombre_tarea="Limpiar mesada",
):
    requisitos = (
        [TareaInsumoQuimico(insumo_quimico_id=quimico.id, cantidad=cantidad_quimico)]
        if quimico is not None
        else []
    )
    tarea = Tarea(
        nombre=nombre_tarea,
        frecuencia=frecuencia,
        procedimiento="Lavar y desinfectar",
        insumos_quimicos=requisitos,
    )
    plan = Plan(
        nombre="Plan cocina",
        descripcion="Limpieza diaria",
        responsable_id=responsable.id,
        fecha_inicio=fecha_inicio or date.today(),
        activo=activo,
        tareas=[tarea],
    )
    db.add(plan)
    db.commit()
    db.refresh(plan)
    db.refresh(tarea)
    return plan, tarea


def cantidad_avisos(db):
    return db.scalar(select(func.count()).select_from(Notificacion))


@pytest.mark.parametrize(
    "frecuencia, fecha, inicio_esperado, fin_esperado",
    [
        (FrecuenciaTarea.DIARIA, date(2026, 3, 18), date(2026, 3, 18), date(2026, 3, 18)),
        (FrecuenciaTarea.SEMANAL, date(2026, 3, 18), date(2026, 3, 16), date(2026, 3, 22)),
        (FrecuenciaTarea.MENSUAL, date(2026, 3, 18), date(2026, 3, 1), date(2026, 3, 31)),
        (FrecuenciaTarea.MENSUAL, date(2024, 2, 10), date(2024, 2, 1), date(2024, 2, 29)),
        (FrecuenciaTarea.MENSUAL, date(2026, 2, 10), date(2026, 2, 1), date(2026, 2, 28)),
    ],
)
def test_calculo_de_periodos_segun_frecuencia(frecuencia, fecha, inicio_esperado, fin_esperado):
    assert periodo_de(frecuencia, fecha) == (inicio_esperado, fin_esperado)


def test_generar_checklist_del_dia_para_planes_activos(db_session, persona_operadora):
    hoy = date(2026, 3, 18)
    tareas = [
        Tarea(nombre="Limpieza diaria", frecuencia=FrecuenciaTarea.DIARIA, procedimiento="P1"),
        Tarea(nombre="Limpieza semanal", frecuencia=FrecuenciaTarea.SEMANAL, procedimiento="P2"),
        Tarea(nombre="Limpieza mensual", frecuencia=FrecuenciaTarea.MENSUAL, procedimiento="P3"),
    ]
    plan = Plan(
        nombre="Plan general",
        descripcion="Todas las frecuencias",
        responsable_id=persona_operadora.id,
        fecha_inicio=hoy,
        activo=True,
        tareas=tareas,
    )
    db_session.add(plan)
    db_session.commit()

    checklist = services.armar_checklist(db_session, persona_operadora.id, hoy)

    assert checklist.total == 3
    assert checklist.pendientes == 3
    assert checklist.realizadas == 0
    por_frecuencia = {item.frecuencia: (item.periodo_inicio, item.periodo_fin) for item in checklist.items}
    assert por_frecuencia == {
        FrecuenciaTarea.DIARIA: (date(2026, 3, 18), date(2026, 3, 18)),
        FrecuenciaTarea.SEMANAL: (date(2026, 3, 16), date(2026, 3, 22)),
        FrecuenciaTarea.MENSUAL: (date(2026, 3, 1), date(2026, 3, 31)),
    }


def test_plan_dado_de_baja_deja_de_generar_tareas(db_session, persona_operadora):
    hoy = date(2026, 3, 18)
    plan, _ = crear_plan_con_tarea(db_session, persona_operadora, fecha_inicio=hoy)

    assert services.armar_checklist(db_session, persona_operadora.id, hoy).total == 1

    plan.activo = False
    db_session.commit()

    checklist_hoy = services.armar_checklist(db_session, persona_operadora.id, hoy)
    checklist_manana = services.armar_checklist(db_session, persona_operadora.id, hoy + timedelta(days=1))

    assert checklist_hoy.total == 0
    assert checklist_manana.total == 0
    assert db_session.scalars(select(ItemChecklist)).all() == []


def test_cambiar_frecuencia_de_tarea_actualiza_pendientes(db_session, persona_operadora):
    hoy = date(2026, 3, 18)
    _, tarea = crear_plan_con_tarea(
        db_session, persona_operadora, frecuencia=FrecuenciaTarea.DIARIA, fecha_inicio=hoy
    )

    inicial = services.armar_checklist(db_session, persona_operadora.id, hoy)
    assert inicial.items[0].frecuencia == FrecuenciaTarea.DIARIA

    tarea.frecuencia = FrecuenciaTarea.SEMANAL
    db_session.commit()

    actualizado = services.armar_checklist(db_session, persona_operadora.id, hoy)

    assert actualizado.total == 1
    item = actualizado.items[0]
    assert item.frecuencia == FrecuenciaTarea.SEMANAL
    assert (item.periodo_inicio, item.periodo_fin) == periodo_de(FrecuenciaTarea.SEMANAL, hoy)
    assert db_session.scalar(select(func.count()).select_from(ItemChecklist)) == 1


def test_finalizar_marca_realizada_y_registra_quien_y_cuando(db_session, persona_operadora):
    hoy = date.today()
    crear_plan_con_tarea(db_session, persona_operadora, fecha_inicio=hoy)
    item = services.armar_checklist(db_session, persona_operadora.id, hoy).items[0]

    antes = datetime.now()
    finalizado = services.finalizar_item_checklist(db_session, item.id, persona_operadora.id)
    despues = datetime.now()

    assert finalizado.estado == EstadoItem.REALIZADA
    assert finalizado.realizada_por_id == persona_operadora.id
    assert antes <= finalizado.realizada_en <= despues
    movimientos = db_session.scalars(
        select(MovimientoItemChecklist).where(MovimientoItemChecklist.item_id == item.id)
    ).all()
    assert len(movimientos) == 1
    assert movimientos[0].accion == AccionMovimiento.REALIZADA
    assert movimientos[0].personal_id == persona_operadora.id


def test_finalizar_descuenta_stock_y_crea_consumo_quimico(db_session, unidad_medida, persona_operadora):
    hoy = date.today()
    quimico = crear_quimico(db_session, unidad_medida, cantidad=10, minimo=2)
    crear_plan_con_tarea(
        db_session, persona_operadora, quimico=quimico, cantidad_quimico=3, fecha_inicio=hoy
    )
    item = services.armar_checklist(db_session, persona_operadora.id, hoy).items[0]

    services.finalizar_item_checklist(
        db_session,
        item.id,
        persona_operadora.id,
        consumos=[InsumoQuimicoConsumido(insumo_quimico_id=quimico.id, cantidad_utilizada=3)],
    )

    db_session.refresh(quimico)
    assert quimico.cantidad == 7
    consumos = db_session.scalars(select(ConsumoQuimico)).all()
    assert len(consumos) == 1
    assert consumos[0].insumo_quimico_id == quimico.id
    assert consumos[0].cantidad_utilizada == 3
    assert consumos[0].operario_id == persona_operadora.id
    assert consumos[0].tarea_limpieza == "Limpiar mesada"
    assert consumos[0].activo is True


def test_stock_insuficiente_no_finaliza_la_tarea(db_session, unidad_medida, persona_operadora):
    hoy = date.today()
    quimico = crear_quimico(db_session, unidad_medida, cantidad=2, minimo=1)
    crear_plan_con_tarea(
        db_session, persona_operadora, quimico=quimico, cantidad_quimico=5, fecha_inicio=hoy
    )
    item = services.armar_checklist(db_session, persona_operadora.id, hoy).items[0]

    with pytest.raises(BadRequest) as error:
        services.finalizar_item_checklist(
            db_session,
            item.id,
            persona_operadora.id,
            consumos=[InsumoQuimicoConsumido(insumo_quimico_id=quimico.id, cantidad_utilizada=5)],
        )

    assert "Stock insuficiente" in error.value.detail
    item_db = db_session.get(ItemChecklist, item.id)
    db_session.refresh(quimico)
    assert item_db.estado == EstadoItem.PENDIENTE
    assert quimico.cantidad == 2
    assert db_session.scalars(select(ConsumoQuimico)).all() == []
    assert db_session.scalars(select(PlanRealizado)).all() == []
    assert db_session.scalars(select(TareaRealizada)).all() == []


def test_finalizar_crea_plan_realizado_y_tarea_realizada_del_dia(db_session, unidad_medida, persona_operadora):
    hoy = date.today()
    quimico = crear_quimico(db_session, unidad_medida, cantidad=10, minimo=2)
    plan, tarea = crear_plan_con_tarea(
        db_session, persona_operadora, quimico=quimico, cantidad_quimico=4, fecha_inicio=hoy
    )
    item = services.armar_checklist(db_session, persona_operadora.id, hoy).items[0]

    services.finalizar_item_checklist(
        db_session,
        item.id,
        persona_operadora.id,
        consumos=[InsumoQuimicoConsumido(insumo_quimico_id=quimico.id, cantidad_utilizada=4)],
    )

    planes_realizados = db_session.scalars(select(PlanRealizado)).all()
    tareas_realizadas = db_session.scalars(select(TareaRealizada)).all()
    assert len(planes_realizados) == 1
    assert planes_realizados[0].plan_origen_id == plan.id
    assert planes_realizados[0].responsable_id == persona_operadora.id
    assert len(tareas_realizadas) == 1
    assert tareas_realizadas[0].plan_realizado_id == planes_realizados[0].id
    assert tareas_realizadas[0].tarea_origen_id == tarea.id
    assert tareas_realizadas[0].insumos_utilizados == [{"id": quimico.id, "cantidad": 4}]


def test_no_se_puede_finalizar_dos_veces_la_misma_tarea(db_session, unidad_medida, persona_operadora):
    hoy = date.today()
    quimico = crear_quimico(db_session, unidad_medida, cantidad=10, minimo=1)
    crear_plan_con_tarea(
        db_session, persona_operadora, quimico=quimico, cantidad_quimico=3, fecha_inicio=hoy
    )
    item = services.armar_checklist(db_session, persona_operadora.id, hoy).items[0]
    consumos = [InsumoQuimicoConsumido(insumo_quimico_id=quimico.id, cantidad_utilizada=3)]

    services.finalizar_item_checklist(db_session, item.id, persona_operadora.id, consumos=consumos)

    with pytest.raises(BadRequest) as error:
        services.finalizar_item_checklist(db_session, item.id, persona_operadora.id, consumos=consumos)

    assert "ya se encuentra realizada" in error.value.detail
    db_session.refresh(quimico)
    assert quimico.cantidad == 7
    assert db_session.scalar(select(func.count()).select_from(ConsumoQuimico)) == 1


@pytest.mark.parametrize("fallar", [False, True])
def test_checklist_aviso_y_rollback(db_session, unidad_medida, persona_operadora, monkeypatch, fallar):
    q = crear_quimico(db_session, unidad_medida)
    tarea = Tarea(
        nombre="Limpiar",
        frecuencia=FrecuenciaTarea.DIARIA,
        procedimiento="Lavar",
        insumos_quimicos=[TareaInsumoQuimico(insumo_quimico_id=q.id, cantidad=5)],
    )
    plan = Plan(nombre="Plan", descripcion="Prueba", responsable_id=persona_operadora.id, tareas=[tarea])
    db_session.add(plan)
    db_session.flush()
    item = ItemChecklist(
        plan_id=plan.id,
        tarea_id=tarea.id,
        responsable_id=persona_operadora.id,
        frecuencia=FrecuenciaTarea.DIARIA,
        periodo_inicio=date.today(),
        periodo_fin=date.today(),
    )
    db_session.add(item)
    db_session.commit()

    def fallo(*args, **kwargs):
        raise RuntimeError("fallo aviso")

    if fallar:
        monkeypatch.setattr(avisos, "revisar_stock_insumo", fallo)

    def ejecutar():
        services.finalizar_item_checklist(
            db_session,
            item.id,
            persona_operadora.id,
            consumos=[InsumoQuimicoConsumido(insumo_quimico_id=q.id, cantidad_utilizada=5)],
        )

    if fallar:
        with pytest.raises(RuntimeError):
            ejecutar()
        assert item.estado == EstadoItem.PENDIENTE and q.cantidad == 10
        assert db_session.scalar(select(func.count()).select_from(MovimientoItemChecklist)) == 0
        assert cantidad_avisos(db_session) == 0
    else:
        ejecutar()
        assert item.estado == EstadoItem.REALIZADA and q.cantidad == 5 and (cantidad_avisos(db_session) == 1)