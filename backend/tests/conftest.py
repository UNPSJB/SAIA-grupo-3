"""Recursos comunes: SQLite en memoria y aplicación sin lifespan ni scheduler."""
import os

# Antes de importar src: nunca conectar al archivo configurado para desarrollo.
os.environ['DB_URL'] = 'sqlite://'
os.environ['DB_URL_TEST'] = 'sqlite://'
os.environ['SCHEDULER_ACTIVO'] = 'false'

import importlib
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from src.database import get_db
from src.auth.utils import create_access_token
from tests.database import (
    db_session, unidad_medida, producto, insumo_activo, otro_insumo_activo,
    insumo_inactivo, persona_operadora, persona_administradora, persona_sin_permisos,
    headers_operadora, headers_administradora, headers_sin_permisos,
    proveedor_activo, lote_recepcion,
)


@pytest.fixture
def client(db_session):
    api = FastAPI()
    for nombre in ('unidadMedida', 'insumos', 'insumosQuimicos', 'producto',
                   'loteProduccion', 'abastecimiento', 'tablero', 'incidente',
                   'documentacion', 'vistaPublica', 'notificaciones',
                   'consumoQuimico', 'checklist', 'equipos', 'registroTemperatura',
                   'tarea', 'receta', 'claseFuncional', 'aditivoReferencia'):
        modulo = importlib.import_module(f'src.{nombre}.router')
        api.include_router(modulo.router)
        for extra in ('publico_router', 'vencimientos_router'):
            if hasattr(modulo, extra):
                api.include_router(getattr(modulo, extra))
    def conexion_pruebas():
        yield db_session
    api.dependency_overrides[get_db] = conexion_pruebas
    with TestClient(api) as cliente:
        yield cliente
    api.dependency_overrides.clear()


@pytest.fixture
def admin_headers(headers_administradora):
    return headers_administradora


@pytest.fixture
def equipo_frio(db_session):
    from src.sector.models import Sector
    from src.equipos.models import Equipo, TipoEquipo
    sector = Sector(nombre='Sector de pruebas', activo=True)
    db_session.add(sector)
    db_session.flush()
    equipo = Equipo(numero_serie='FRIO-TEST', nombre='Heladera de pruebas',
                    tipo=TipoEquipo.EQUIPO, sector_id=sector.id, activo=True,
                    controla_temperatura=True, temperatura_minima=2, temperatura_maxima=8)
    db_session.add(equipo)
    db_session.commit()
    return equipo


@pytest.fixture
def item_checklist(db_session, persona_operadora, unidad_medida):
    from datetime import date
    from src.plan.models import Plan
    from src.tarea.models import Tarea, FrecuenciaTarea, TareaInsumoQuimico
    from src.checklist.models import ItemChecklist
    from src.insumosQuimicos.models import InsumoQuimico, TipoQuimico
    quimico = InsumoQuimico(nombre='Detergente de prueba', cantidad=10,
        stock_minimo=5, tipo_quimico=TipoQuimico.DETERGENTE, unidad_medida_id=unidad_medida.id, activo=True)
    tarea = Tarea(nombre='Limpiar', frecuencia=FrecuenciaTarea.DIARIA, procedimiento='Lavar y secar')
    plan = Plan(nombre='Plan de prueba', descripcion='Prueba', responsable_id=persona_operadora.id, tareas=[tarea])
    db_session.add_all([quimico, plan]); db_session.flush()
    db_session.add(TareaInsumoQuimico(tarea_id=tarea.id, insumo_quimico_id=quimico.id, cantidad=5))
    item = ItemChecklist(plan_id=plan.id, tarea_id=tarea.id, responsable_id=persona_operadora.id,
        frecuencia=FrecuenciaTarea.DIARIA, periodo_inicio=date.today(), periodo_fin=date.today())
    db_session.add(item); db_session.commit()
    return item, quimico


MODULOS_ENTREGA = {
    'unidadMedida', 'insumos', 'insumosQuimicos', 'tablero', 'incidente',
    'documentacion', 'vistaPublica', 'producto', 'loteProduccion',
    'notificaciones', 'consumoQuimico', 'checklist', 'equipos',
    'registroTemperatura', 'abastecimiento',
}


def pytest_configure(config):
    config.addinivalue_line('markers', 'entrega_backend: Sprint 4, Sprint 5, historias propias y maestros; excluye seeds y migraciones.')


def pytest_collection_modifyitems(items):
    for item in items:
        if item.path.parent.name in MODULOS_ENTREGA and item.path.name in {
            'test_services.py', 'test_router.py', 'test_scheduler.py'}:
            item.add_marker(pytest.mark.entrega_backend)
