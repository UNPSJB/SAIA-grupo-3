"""Aceptación de stock mínimo; toda la persistencia se hace en SQLite aislado."""
from datetime import date
import sqlite3
from pathlib import Path
import pytest
from pydantic import ValidationError
from sqlalchemy import select, func
from tests.database import db_session, unidad_medida, insumo_activo, producto, persona_operadora
from src.insumos.models import Insumo
from src.insumos.schemas import InsumoCreate, InsumoUpdate
from src.insumos import services as ingredientes
from src.insumosQuimicos.models import InsumoQuimico, TipoQuimico
from src.insumosQuimicos.schemas import InsumoQuimicoCreate, InsumoQuimicoUpdate
from src.insumosQuimicos import services as quimicos
from src.notificaciones.models import Notificacion
from src.notificaciones import services as avisos
from src.consumoQuimico import services as consumos
from src.consumoQuimico.schemas import ConsumoQuimicoCreate, ConsumoQuimicoUpdate
from src.consumoQuimico.models import ConsumoQuimico
from scripts.migrate_stock_minimo import migrar

def crear_quimico(db, unidad, nombre='Detergente', cantidad=10, minimo=5):
    return quimicos.crear_insumo_quimico(db, InsumoQuimicoCreate(nombre=nombre, cantidad=cantidad, stock_minimo=minimo, tipo_quimico=TipoQuimico.DETERGENTE, unidad_medida_id=unidad.id))

def recibir_prueba(db, insumo, actor, cantidad):
    if not cantidad:
        return
    from datetime import timedelta
    from uuid import uuid4
    from src.abastecimiento.models import Proveedor, LoteRecepcionInsumo
    proveedor = Proveedor(nombre='Proveedor ficticio', cuit=str(uuid4()), activo=True)
    db.add(proveedor)
    db.flush()
    db.add(LoteRecepcionInsumo(insumo_id=insumo.id, proveedor_id=proveedor.id, numero_lote='TEST', cantidad=cantidad, cantidad_disponible=cantidad, fecha_recepcion=date.today(), fecha_vencimiento=date.today() + timedelta(days=30), registrado_por_id=actor.id, clave_operacion=str(uuid4()), activo=True, conciliacion=False))
    db.commit()
    db.refresh(insumo)

def usar(db, q, cantidad=5):
    return consumos.crear_consumo(db, ConsumoQuimicoCreate(insumo_quimico_id=q.id, cantidad_utilizada=cantidad, fecha=date.today(), tarea_limpieza='Limpieza demo'))

def cantidad_avisos(db):
    return db.scalar(select(func.count()).select_from(Notificacion))

@pytest.mark.parametrize('fallar', [False, True])
def test_checklist_aviso_y_rollback(db_session, unidad_medida, persona_operadora, monkeypatch, fallar):
    from src.plan.models import Plan
    from src.tarea.models import Tarea, TareaInsumoQuimico, FrecuenciaTarea
    from src.checklist.models import ItemChecklist, EstadoItem, MovimientoItemChecklist
    from src.checklist.services import finalizar_item_checklist
    from src.checklist.schemas import InsumoQuimicoConsumido
    q = crear_quimico(db_session, unidad_medida)
    tarea = Tarea(nombre='Limpiar', frecuencia=FrecuenciaTarea.DIARIA, procedimiento='Lavar', insumos_quimicos=[TareaInsumoQuimico(insumo_quimico_id=q.id, cantidad=5)])
    plan = Plan(nombre='Plan', descripcion='Prueba', responsable_id=persona_operadora.id, tareas=[tarea])
    db_session.add(plan)
    db_session.flush()
    item = ItemChecklist(plan_id=plan.id, tarea_id=tarea.id, responsable_id=persona_operadora.id, frecuencia=FrecuenciaTarea.DIARIA, periodo_inicio=date.today(), periodo_fin=date.today())
    db_session.add(item)
    db_session.commit()

    def fallo(*args, **kwargs):
        raise RuntimeError('fallo aviso')
    if fallar:
        monkeypatch.setattr(avisos, 'revisar_stock_insumo', fallo)

    def ejecutar():
        finalizar_item_checklist(db_session, item.id, persona_operadora.id, consumos=[InsumoQuimicoConsumido(insumo_quimico_id=q.id, cantidad_utilizada=5)])
    if fallar:
        with pytest.raises(RuntimeError):
            ejecutar()
        assert item.estado == EstadoItem.PENDIENTE and q.cantidad == 10
        assert db_session.scalar(select(func.count()).select_from(MovimientoItemChecklist)) == 0
        assert cantidad_avisos(db_session) == 0
    else:
        ejecutar()
        assert item.estado == EstadoItem.REALIZADA and q.cantidad == 5 and (cantidad_avisos(db_session) == 1)
