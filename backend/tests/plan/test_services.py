from datetime import date

import pytest
from pydantic import ValidationError

from src.plan import exceptions, schemas, services


def test_crear_plan_con_tareas_y_fecha_inicio_hoy(
    db_session,
    persona_operadora,
    sector_cocina,
    tarea_limpieza_horno,
    tarea_desinfeccion_mesada,
):
    datos = schemas.PlanCreate(
        nombre="POES Cocina",
        descripcion="Plan diario de limpieza de cocina.",
        responsable_id=persona_operadora.id,
        sector_id=sector_cocina.id,
        tarea_ids=[tarea_limpieza_horno.id, tarea_desinfeccion_mesada.id],
    )

    plan = services.crear_plan(db_session, datos)

    assert plan.id is not None
    assert plan.activo is True
    assert plan.fecha_inicio == date.today()
    assert plan.fecha_fin is None
    assert {t.id for t in plan.tareas} == {
        tarea_limpieza_horno.id,
        tarea_desinfeccion_mesada.id,
    }


def test_crear_plan_error_si_alguna_tarea_no_existe(
    db_session, persona_operadora, sector_cocina, tarea_limpieza_horno
):
    datos = schemas.PlanCreate(
        nombre="Plan con tarea inexistente",
        descripcion="Debe fallar.",
        responsable_id=persona_operadora.id,
        sector_id=sector_cocina.id,
        tarea_ids=[tarea_limpieza_horno.id, 999999],
    )

    with pytest.raises(exceptions.TareasNoEncontradas):
        services.crear_plan(db_session, datos)


def test_crear_plan_error_si_no_tiene_sector_ni_equipo(persona_operadora):
    with pytest.raises(ValidationError, match="sector o a un equipo"):
        schemas.PlanCreate(
            nombre="Plan sin destino",
            descripcion="Falta sector y equipo.",
            responsable_id=persona_operadora.id,
            sector_id=None,
            equipo_id=None,
            tarea_ids=[1],
        )


def test_plan_exige_al_menos_una_tarea(
    db_session, persona_operadora, sector_cocina, tarea_limpieza_horno
):
    with pytest.raises(ValidationError):
        schemas.PlanCreate(
            nombre="Plan vacío",
            descripcion="Sin tareas.",
            responsable_id=persona_operadora.id,
            sector_id=sector_cocina.id,
            tarea_ids=[],
        )

    plan = services.crear_plan(
        db_session,
        schemas.PlanCreate(
            nombre="POES Cocina",
            descripcion="Plan válido.",
            responsable_id=persona_operadora.id,
            sector_id=sector_cocina.id,
            tarea_ids=[tarea_limpieza_horno.id],
        ),
    )

    with pytest.raises(exceptions.TareasRequeridas):
        services.modificar_plan(
            db_session, plan.id, schemas.PlanUpdate(tarea_ids=[])
        )


def test_dar_de_baja_plan_registra_fecha_fin_y_reactivar_la_limpia(
    db_session, persona_operadora, equipo_horno, tarea_limpieza_horno
):
    plan = services.crear_plan(
        db_session,
        schemas.PlanCreate(
            nombre="POES Horno",
            descripcion="Limpieza del horno.",
            responsable_id=persona_operadora.id,
            equipo_id=equipo_horno.id,
            tarea_ids=[tarea_limpieza_horno.id],
        ),
    )

    baja = services.eliminar_plan(db_session, plan.id)
    assert baja.activo is False
    assert baja.fecha_fin == date.today()

    reactivado = services.modificar_plan(
        db_session, plan.id, schemas.PlanUpdate(activo=True)
    )
    assert reactivado.activo is True
    assert reactivado.fecha_inicio == date.today()
    assert reactivado.fecha_fin is None


def test_plan_valida_sector_equipo_y_responsable(
    db_session, persona_operadora, persona_sin_permisos, sector_cocina, tarea_limpieza_horno
):
    with pytest.raises(exceptions.SectorNoExiste):
        services.crear_plan(
            db_session,
            schemas.PlanCreate(
                nombre="Sector inválido",
                descripcion="Desc.",
                responsable_id=persona_operadora.id,
                sector_id=999999,
                tarea_ids=[tarea_limpieza_horno.id],
            ),
        )

    with pytest.raises(exceptions.EquipoNoExiste):
        services.crear_plan(
            db_session,
            schemas.PlanCreate(
                nombre="Equipo inválido",
                descripcion="Desc.",
                responsable_id=persona_operadora.id,
                equipo_id=999999,
                tarea_ids=[tarea_limpieza_horno.id],
            ),
        )

    with pytest.raises(exceptions.ResponsableNoValido):
        services.crear_plan(
            db_session,
            schemas.PlanCreate(
                nombre="Responsable sin operar",
                descripcion="Desc.",
                responsable_id=persona_sin_permisos.id,
                sector_id=sector_cocina.id,
                tarea_ids=[tarea_limpieza_horno.id],
            ),
        )

    with pytest.raises(exceptions.PlanNoEncontrado):
        services.leer_plan(db_session, 999999)