"""Escenarios aislados de stock mínimo, identificados como DEMO y repetibles."""
from datetime import timedelta

from scripts.seed_abastecimiento import recibir_demo
from src.checklist.models import EstadoItem, ItemChecklist
from src.insumos.models import Insumo
from src.insumosQuimicos.models import InsumoQuimico, TipoQuimico
from src.notificaciones.services import revisar_stock_insumo
from src.plan.models import Plan
from src.producto.models import Producto
from src.tarea.models import FrecuenciaTarea, Tarea, TareaInsumoQuimico


# Código estable, nombre visible, cantidad inicial y mínimo.
CASOS = (
    ("normal", "Por encima del mínimo", 12.0, 5.0),
    ("igual", "En el mínimo", 5.0, 5.0),
    ("bajo", "Por debajo del mínimo", 2.0, 5.0),
    ("sin-minimo", "Sin mínimo definido", 0.0, None),
    ("cero", "Mínimo cero", 0.0, 0.0),
    ("repuesto", "Aviso resuelto por reposición", 2.0, 5.0),
    ("preparado", "Listo para consumir", 6.0, 5.0),
)
NOMBRE_TAREA = "DEMO stock - Limpieza para disparar aviso (1 L)"
NOMBRE_PLAN = "DEMO stock - Prueba de checklist y reposición"
NOMBRE_PRODUCTO = "DEMO stock - Pan para probar mínimo"


def nombre_caso(codigo, quimico=False):
    etiqueta = next(nombre for clave, nombre, _, _ in CASOS if clave == codigo)
    return f"DEMO stock - {etiqueta}"


def cargar_stock_minimo(db, crear, unidades, proveedores, admin, hoy):
    listos = {}
    proveedor = next((p for p in proveedores if p.activo), None)
    for quimico in (False, True):
        modelo = InsumoQuimico if quimico else Insumo
        unidad = unidades["L" if quimico else "kg"]
        for codigo, _, cantidad, minimo in CASOS:
            valores = dict(stock_minimo=minimo, unidad_medida_id=unidad.id, activo=True)
            if quimico:
                valores.update(cantidad=cantidad, tipo_quimico=TipoQuimico.DETERGENTE)
            insumo, nuevo = crear(modelo, {"nombre": nombre_caso(codigo, quimico)}, **valores)
            if codigo == "preparado":
                listos[quimico] = insumo
            # No reinicia cantidades, mínimos, lecturas ni avisos al repetir.
            if not nuevo:
                continue
            if not quimico and cantidad:
                if proveedor is None:
                    raise RuntimeError("Los ejemplos de stock necesitan un proveedor DEMO activo.")
                recibir_demo(db, crear, insumo, proveedor, cantidad,
                    f"saia:seed:stock-minimo:{codigo}:inicial", f"DEMO-STOCK-{codigo.upper()}",
                    admin.id, hoy - timedelta(days=1), hoy + timedelta(days=180))
            db.flush()
            db.refresh(insumo)
            revisar_stock_insumo(db, insumo, confirmar=False)
            if codigo == "repuesto":
                # Un aviso genuino de mínimo pasa a resuelto después de reponer.
                if quimico:
                    insumo.cantidad += 10
                else:
                    recibir_demo(db, crear, insumo, proveedor, 10,
                        "saia:seed:stock-minimo:repuesto:reposicion", "DEMO-STOCK-REPOSICION",
                        admin.id, hoy, hoy + timedelta(days=180))
                db.flush()
                db.refresh(insumo)
                revisar_stock_insumo(db, insumo, confirmar=False)

    # No consume ni produce de antemano: deja disponibles las acciones de prueba.
    crear(Producto, {"nombre": NOMBRE_PRODUCTO},
        descripcion="DEMO: usar 1 kg de 'DEMO stock - Listo para consumir' para alcanzar el mínimo.",
        unidad_medida_id=unidades["kg"].id, activo=True)
    tarea, nueva = crear(Tarea, {"nombre": NOMBRE_TAREA},
        frecuencia=FrecuenciaTarea.DIARIA,
        procedimiento="DEMO: completar la tarea consume 1 L del químico preparado y alcanza su mínimo.")
    if nueva:
        crear(TareaInsumoQuimico,
            {"tarea_id": tarea.id, "insumo_quimico_id": listos[True].id}, cantidad=1.0)
    plan, nuevo = crear(Plan, {"nombre": NOMBRE_PLAN},
        descripcion="DEMO de aviso de stock por checklist; responsable inicial: administración.",
        responsable_id=admin.id, activo=True, fecha_inicio=hoy)
    if nuevo:
        plan.tareas = [tarea]
    if (plan.activo and tarea in plan.tareas and tarea.frecuencia == FrecuenciaTarea.DIARIA
            and (plan.fecha_inicio is None or plan.fecha_inicio <= hoy)
            and (plan.fecha_fin is None or plan.fecha_fin >= hoy)):
        crear(ItemChecklist,
            {"plan_id": plan.id, "tarea_id": tarea.id, "frecuencia": FrecuenciaTarea.DIARIA,
             "periodo_inicio": hoy}, periodo_fin=hoy,
            responsable_id=plan.responsable_id, estado=EstadoItem.PENDIENTE)
