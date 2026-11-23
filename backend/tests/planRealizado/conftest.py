from datetime import datetime

import pytest

from src.planRealizado import schemas, services
from tests.plan.conftest import (
    equipo_horno,
    guardar,
    sector_cocina,
    tarea_desinfeccion_mesada,
    tarea_limpieza_horno,
)

__all__ = ["equipo_horno", "guardar", "sector_cocina", "tarea_desinfeccion_mesada", "tarea_limpieza_horno"]


def tarea_desde(tarea, **extra):
    return {
        "tarea_origen_id": tarea.id,
        "nombre": tarea.nombre,
        "frecuencia": tarea.frecuencia.value,
        "procedimiento": tarea.procedimiento,
        "equipo_id": tarea.equipo_id,
        **extra,
    }


@pytest.fixture
def datos_plan(persona_operadora, sector_cocina, tarea_limpieza_horno, tarea_desinfeccion_mesada):
    def armar(nombre="POES Cocina", descripcion="Limpieza diaria de cocina.", tareas=None):
        return {
            "nombre": nombre,
            "descripcion": descripcion,
            "responsable_id": persona_operadora.id,
            "sector_id": sector_cocina.id,
            "tareas_realizadas": tareas
            if tareas is not None
            else [
                tarea_desde(
                    tarea_limpieza_horno,
                    elementos_utilizados=[{"id": 1, "nombre": "Esponja"}],
                    insumos_utilizados=[{"id": 2, "nombre": "Desengrasante", "cantidad": 0.5}],
                ),
                tarea_desde(tarea_desinfeccion_mesada),
            ],
        }

    return armar


@pytest.fixture
def plan_realizado(db_session, datos_plan):
    def crear(fecha=None, **kwargs):
        plan = services.crear_plan_realizado(db_session, schemas.PlanRealizadoCreate(**datos_plan(**kwargs)))
        if fecha is not None:
            plan.fecha_ejecucion = fecha
            db_session.commit()
            db_session.refresh(plan)
        return plan

    return crear


def el_dia(anio, mes, dia, hora=10):
    return datetime(anio, mes, dia, hora, 0)
