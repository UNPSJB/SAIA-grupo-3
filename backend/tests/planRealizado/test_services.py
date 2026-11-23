from datetime import date

import pytest
from sqlalchemy import func, select

from src.planRealizado import exceptions, schemas, services
from src.tarea.models import Tarea
from src.tareaRealizada.models import TareaRealizada
from tests.planRealizado.conftest import el_dia


def test_crear_un_plan_realizado_guarda_una_copia_de_sus_tareas(
    db_session, datos_plan, persona_operadora, tarea_limpieza_horno, tarea_desinfeccion_mesada
):
    plan = services.crear_plan_realizado(db_session, schemas.PlanRealizadoCreate(**datos_plan()))

    assert plan.id is not None
    assert plan.responsable_id == persona_operadora.id
    assert plan.fecha_ejecucion is not None
    copias = {t.tarea_origen_id: t for t in plan.tareas_realizadas}
    assert set(copias) == {tarea_limpieza_horno.id, tarea_desinfeccion_mesada.id}
    horno = copias[tarea_limpieza_horno.id]
    assert horno.nombre == "Limpieza de horno"
    assert horno.procedimiento == "Retirar residuos y aplicar desengrasante."
    assert horno.equipo_id == tarea_limpieza_horno.equipo_id
    assert horno.elementos_utilizados == [{"id": 1, "nombre": "Esponja"}]
    assert horno.insumos_utilizados == [{"id": 2, "nombre": "Desengrasante", "cantidad": 0.5}]
    assert all(t.plan_realizado_id == plan.id for t in plan.tareas_realizadas)


def test_la_copia_no_cambia_si_despues_se_modifica_la_tarea_original(
    db_session, plan_realizado, tarea_limpieza_horno
):
    plan = plan_realizado()

    tarea = db_session.get(Tarea, tarea_limpieza_horno.id)
    tarea.nombre = "Limpieza de horno (nuevo procedimiento)"
    tarea.procedimiento = "Otro procedimiento."
    db_session.commit()

    copia = next(t for t in services.leer_plan_realizado(db_session, plan.id).tareas_realizadas
                 if t.tarea_origen_id == tarea_limpieza_horno.id)
    assert copia.nombre == "Limpieza de horno"
    assert copia.procedimiento == "Retirar residuos y aplicar desengrasante."


def test_listar_filtrando_por_rango_de_fechas(db_session, plan_realizado):
    plan_realizado(nombre="Octubre", fecha=el_dia(2026, 10, 31, 23))
    plan_realizado(nombre="Primero de noviembre", fecha=el_dia(2026, 11, 1, 0))
    plan_realizado(nombre="Diez de noviembre", fecha=el_dia(2026, 11, 10))
    plan_realizado(nombre="Diciembre", fecha=el_dia(2026, 12, 1))

    noviembre = services.listar_planes_realizados(db_session, desde=date(2026, 11, 1), hasta=date(2026, 11, 30))
    desde = services.listar_planes_realizados(db_session, desde=date(2026, 11, 10))
    hasta = services.listar_planes_realizados(db_session, hasta=date(2026, 10, 31))
    un_dia = services.listar_planes_realizados(db_session, desde=date(2026, 11, 10), hasta=date(2026, 11, 10))

    assert [p.nombre for p in noviembre["items"]] == ["Diez de noviembre", "Primero de noviembre"]
    assert noviembre["total"] == 2
    assert [p.nombre for p in desde["items"]] == ["Diciembre", "Diez de noviembre"]
    assert [p.nombre for p in hasta["items"]] == ["Octubre"]
    assert [p.nombre for p in un_dia["items"]] == ["Diez de noviembre"]


def test_listar_sin_filtros_trae_todo_del_mas_reciente_al_mas_antiguo(db_session, plan_realizado):
    plan_realizado(nombre="Viejo", fecha=el_dia(2026, 1, 5))
    plan_realizado(nombre="Nuevo", fecha=el_dia(2026, 6, 5))

    resultado = services.listar_planes_realizados(db_session)

    assert [p.nombre for p in resultado["items"]] == ["Nuevo", "Viejo"]
    assert resultado["total"] == 2 and resultado["pages"] == 1


def test_eliminar_un_plan_realizado_borra_tambien_sus_tareas_realizadas(db_session, plan_realizado):
    plan = plan_realizado()
    otro = plan_realizado(nombre="Otro plan")
    plan_id = plan.id

    services.eliminar_plan_realizado(db_session, plan_id)

    db_session.expire_all()
    with pytest.raises(exceptions.PlanRealizadoNoEncontrado):
        services.leer_plan_realizado(db_session, plan_id)
    restantes = db_session.scalar(
        select(func.count()).select_from(TareaRealizada).where(TareaRealizada.plan_realizado_id == plan_id)
    )
    assert restantes == 0
    assert len(services.leer_plan_realizado(db_session, otro.id).tareas_realizadas) == 2


def test_leer_un_plan_realizado_inexistente_da_error(db_session):
    with pytest.raises(exceptions.PlanRealizadoNoEncontrado):
        services.leer_plan_realizado(db_session, 999999)
