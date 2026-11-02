"""Lotes de producción y consumo histórico aplicado una sola vez."""

from datetime import datetime, time, timedelta

from sqlalchemy import select

from scripts.seed_common import CANTIDAD, obtener_o_crear
from src.abastecimiento.models import (
    ConsumoLoteRecepcion,
    ConsumoStockAnterior,
    LoteRecepcionInsumo,
)
from src.loteProduccion.constants import EstadoLote
from src.loteProduccion.models import LoteInsumo, LoteProduccion


RECETAS_LOTES_DEMO = {
    "Pan de molde blanco": [("Harina de trigo", 8.0), ("Azúcar", 0.6), ("Agua", 4.0), ("Levadura", 150.0), ("Aceite", 0.5), ("Sal", 0.12)],
    "Pan francés": [("Harina de trigo", 10.0), ("Agua", 6.0), ("Levadura", 200.0), ("Sal", 0.2)],
    "Facturas surtidas": [("Harina de trigo", 8.0), ("Azúcar", 1.0), ("Agua", 2.0), ("Levadura", 250.0), ("Aceite", 1.0), ("Sal", 0.1)],
    "Prepizza": [("Harina de trigo", 6.0), ("Agua", 3.5), ("Levadura", 100.0), ("Aceite", 0.5), ("Sal", 0.12)],
    "Tapas de empanada": [("Harina de trigo", 8.0), ("Agua", 2.0), ("Aceite", 1.5), ("Sal", 0.12)],
    "Masa de hojaldre": [("Harina de trigo", 6.0), ("Agua", 2.0), ("Aceite", 0.5), ("Sal", 0.1)],
    "Galletitas de agua": [("Harina de trigo", 5.0), ("Azúcar", 1.5), ("Agua", 1.5), ("Aceite", 1.0), ("Sal", 0.15)],
    "Budín de vainilla": [("Harina de trigo", 3.0), ("Azúcar", 2.0), ("Agua", 1.5), ("Aceite", 1.2), ("Sal", 0.05)],
    "Torta de chocolate": [("Harina de trigo", 3.0), ("Azúcar", 1.5), ("Agua", 2.0), ("Aceite", 1.0)],
    "Alfajores de maicena": [("Harina de trigo", 3.5), ("Azúcar", 1.0), ("Agua", 1.0), ("Aceite", 0.6), ("Sal", 0.05)],
    "Salsa de tomate": [("Tomate triturado", 12.0), ("Aceite", 0.3), ("Sal", 0.15)],
    "Dulce de leche repostero": [("Leche", 8.0), ("Azúcar", 2.0)],
    "Empanadas de carne": [("Harina de trigo", 8.0), ("Carne vacuna", 5.0), ("Cebolla", 2.0), ("Sal", 0.1)],
    "Tarta de verduras": [("Harina de trigo", 3.0), ("Verduras para tarta", 4.0), ("Leche", 1.0), ("Sal", 0.1)],
    "Ñoquis de papa": [("Papa", 10.0), ("Harina de trigo", 2.0), ("Huevo", 1.0), ("Sal", 0.1)],
}


def asociar_ingredientes_demo(db, lote, ingredientes_por_nombre, *, receta=None, crear=None):
    """Registra una vez el consumo histórico demo y su origen, sin commits parciales."""
    def guardar(modelo, filtros, **valores):
        if crear is not None:
            return crear(modelo, filtros, **valores)
        return obtener_o_crear(db, modelo, filtros, valores)

    receta = receta if receta is not None else RECETAS_LOTES_DEMO.get(lote.producto.nombre, [])
    for nombre, cantidad_usada in receta:
        ingrediente = ingredientes_por_nombre[nombre]
        asociacion, asociacion_nueva = guardar(
            LoteInsumo,
            {"lote_id": lote.id, "insumo_id": ingrediente.id},
            cantidad_usada=cantidad_usada,
        )
        if asociacion_nueva:
            # El seed genera historia: la vigencia se verifica en la fecha
            # de esa producción, no contra la fecha actual de ejecución.
            db.flush()
            recepciones = db.scalars(
                select(LoteRecepcionInsumo)
                .where(
                    LoteRecepcionInsumo.insumo_id == ingrediente.id,
                    LoteRecepcionInsumo.activo.is_(True),
                    LoteRecepcionInsumo.cantidad_disponible > 0,
                )
                .order_by(LoteRecepcionInsumo.fecha_vencimiento,
                          LoteRecepcionInsumo.fecha_recepcion, LoteRecepcionInsumo.id)
            ).all()
            identificado = sum(r.cantidad_disponible for r in recepciones)
            sin_lote = ingrediente.cantidad - identificado
            utilizables = [r for r in recepciones if r.fecha_recepcion <= lote.fecha_produccion <= r.fecha_vencimiento]
            saldo = sum(r.cantidad_disponible for r in utilizables)
            if (sin_lote < -1e-9 or ingrediente.cantidad < cantidad_usada
                    or cantidad_usada > saldo + max(0, sin_lote) + 1e-9):
                raise RuntimeError(
                    f"Stock utilizable insuficiente o inconsistente para {nombre} "
                    f"en el lote demo {lote.codigo}. El seed no modifica saldos existentes para ocultarlo."
                )
            pendiente = cantidad_usada
            for recepcion in utilizables:
                if pendiente <= 0:
                    break
                utilizado = min(pendiente, recepcion.cantidad_disponible)
                recepcion.cantidad_disponible = max(0, recepcion.cantidad_disponible - utilizado)
                guardar(ConsumoLoteRecepcion, {
                    "lote_produccion_id": lote.id, "lote_recepcion_id": recepcion.id,
                }, cantidad=utilizado)
                pendiente = max(0, pendiente - utilizado)
            if pendiente > 1e-9:
                guardar(ConsumoStockAnterior, {
                    "lote_produccion_id": lote.id, "insumo_id": ingrediente.id,
                }, cantidad=pendiente)
            ingrediente.cantidad -= asociacion.cantidad_usada
            db.flush()

def cargar_lotes_produccion(db, crear, productos, ingredientes_por_nombre, operadores, admin, hoy):
    for i in range(CANTIDAD):
        fecha_lote = hoy - timedelta(days=[0, 1, 2, 3, 5, 7, 9, 12, 14, 17, 20, 23, 25, 28, 30][i])
        cerrado = i >= 8
        lote_demo, _ = crear(LoteProduccion, {"codigo": f"L-SEED-{i + 1:03d}"},
            producto_id=productos[i % len(productos)].id, fecha_produccion=fecha_lote,
            cantidad=float([24, 15, 60, 30, 20, 8, 40, 12, 6, 36, 10, 5, 48, 9, 7][i]),
            observaciones=None if i % 3 else "Lote de demostración del seed.",
            registrado_por_id=operadores[i % len(operadores)].id,
            fecha_registro=datetime.combine(fecha_lote, time(7 + i % 8, 30)), activo=True,
            estado=EstadoLote.CERRADO if cerrado else EstadoLote.ABIERTO,
            fecha_cierre=datetime.combine(fecha_lote + timedelta(days=1), time(18, 0)) if cerrado else None,
            cerrado_por_id=admin.id if cerrado else None)
        asociar_ingredientes_demo(db, lote_demo, ingredientes_por_nombre, crear=crear)
