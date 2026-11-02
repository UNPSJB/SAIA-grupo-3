"""Lotes de producción y consumo histórico aplicado una sola vez."""

from datetime import datetime, time, timedelta
from math import isclose
from uuid import NAMESPACE_URL, uuid5

from sqlalchemy import func, select

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


def completar_origen_demo(db, crear, lote, proveedores):
    """Completa únicamente consumos de ejemplos conocidos del seed.

    Son recepciones históricas FICTICIAS ya consumidas: el saldo disponible
    es cero y el stock general no se toca porque el consumo ya estaba registrado.
    No es una conciliación ni una reconstrucción de movimientos reales.
    """
    for asociacion in lote.insumos_asociados:
        trazado = db.scalar(select(func.coalesce(func.sum(ConsumoLoteRecepcion.cantidad), 0))
            .join(LoteRecepcionInsumo,
                  LoteRecepcionInsumo.id == ConsumoLoteRecepcion.lote_recepcion_id)
            .where(ConsumoLoteRecepcion.lote_produccion_id == lote.id,
                   LoteRecepcionInsumo.insumo_id == asociacion.insumo_id))
        anterior = db.scalar(select(ConsumoStockAnterior).where(
            ConsumoStockAnterior.lote_produccion_id == lote.id,
            ConsumoStockAnterior.insumo_id == asociacion.insumo_id))
        if trazado + (anterior.cantidad if anterior else 0) > asociacion.cantidad_usada + 1e-9:
            raise RuntimeError(f"El lote demo {lote.codigo} tiene consumos inconsistentes.")
        faltante = asociacion.cantidad_usada - trazado
        if faltante <= 1e-9:
            continue
        proveedor = next((p for p in proveedores if p.activo), None)
        if proveedor is None:
            raise RuntimeError("Se necesita un proveedor demo activo para completar los ejemplos antiguos.")
        clave = str(uuid5(NAMESPACE_URL,
                         f"saia:seed:origen-historico:{lote.codigo}:{asociacion.insumo_id}"))
        recepcion, nueva = crear(LoteRecepcionInsumo, {"clave_operacion": clave},
            insumo_id=asociacion.insumo_id, proveedor_id=proveedor.id,
            numero_lote=f"DEMO-HIST-{lote.codigo}-{asociacion.insumo_id}",
            cantidad=faltante, cantidad_disponible=0.0,
            fecha_recepcion=lote.fecha_produccion - timedelta(days=2),
            fecha_vencimiento=lote.fecha_produccion + timedelta(days=180),
            registrado_por_id=lote.registrado_por_id,
            fecha_registro=datetime.combine(lote.fecha_produccion - timedelta(days=2), time(9)),
            activo=True, conciliacion=False)
        if not nueva:
            raise RuntimeError(f"El origen demo de {lote.codigo} fue alterado; no se sobrescribe.")
        crear(ConsumoLoteRecepcion,
            {"lote_produccion_id": lote.id, "lote_recepcion_id": recepcion.id},
            cantidad=faltante)
        if anterior is not None:
            db.delete(anterior)
        db.flush()


def comprobar_origen_demo(db, lote):
    """Falla la transacción si algún ejemplo queda sin origen completo."""
    db.flush()
    db.expire(lote, ["insumos_asociados"])
    if not lote.insumos_asociados:
        raise RuntimeError(f"El lote demo {lote.codigo} no tiene ingredientes registrados.")
    for asociacion in lote.insumos_asociados:
        fuentes = db.execute(select(ConsumoLoteRecepcion, LoteRecepcionInsumo)
            .join(LoteRecepcionInsumo,
                  LoteRecepcionInsumo.id == ConsumoLoteRecepcion.lote_recepcion_id)
            .where(ConsumoLoteRecepcion.lote_produccion_id == lote.id,
                   LoteRecepcionInsumo.insumo_id == asociacion.insumo_id)).all()
        if (not fuentes or not isclose(sum(c.cantidad for c, _ in fuentes),
                                       asociacion.cantidad_usada, rel_tol=0, abs_tol=1e-9)
                or any(not r.numero_lote.strip() or not r.proveedor or not r.proveedor.nombre.strip()
                       or not r.fecha_recepcion or not r.fecha_vencimiento
                       or not r.fecha_recepcion <= lote.fecha_produccion <= r.fecha_vencimiento
                       for _, r in fuentes)):
            raise RuntimeError(f"La trazabilidad del lote demo {lote.codigo} está incompleta.")


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
            utilizables = [r for r in recepciones if r.fecha_recepcion <= lote.fecha_produccion <= r.fecha_vencimiento]
            saldo = sum(r.cantidad_disponible for r in utilizables)
            if cantidad_usada > saldo + 1e-9:
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
            db.flush()

def cargar_lotes_produccion(db, crear, productos, ingredientes_por_nombre, operadores, admin, hoy,
                           proveedores, *, autores_demo):
    for i in range(CANTIDAD):
        fecha_lote = hoy - timedelta(days=[0, 1, 2, 3, 5, 7, 9, 12, 14, 17, 20, 23, 25, 28, 30][i])
        cerrado = i >= 8
        lote_demo, nuevo = crear(LoteProduccion, {"codigo": f"L-SEED-{i + 1:03d}"},
            producto_id=productos[i % len(productos)].id, fecha_produccion=fecha_lote,
            cantidad=float([24, 15, 60, 30, 20, 8, 40, 12, 6, 36, 10, 5, 48, 9, 7][i]),
            observaciones=None if i % 3 else "Lote de demostración del seed.",
            registrado_por_id=operadores[i % len(operadores)].id,
            fecha_registro=datetime.combine(fecha_lote, time(7 + i % 8, 30)), activo=True,
            estado=EstadoLote.CERRADO if cerrado else EstadoLote.ABIERTO,
            fecha_cierre=datetime.combine(fecha_lote + timedelta(days=1), time(18, 0)) if cerrado else None,
            cerrado_por_id=admin.id if cerrado else None)
        if nuevo:
            asociar_ingredientes_demo(db, lote_demo, ingredientes_por_nombre, crear=crear)
        else:
            # El código reservado, el producto y el autor deben coincidir con
            # los ejemplos conocidos. No completa producciones de usuarios.
            if (lote_demo.producto_id != productos[i % len(productos)].id
                    or lote_demo.registrado_por_id not in autores_demo):
                raise RuntimeError(f"El código demo {lote_demo.codigo} está ocupado por otro registro.")
            if not lote_demo.insumos_asociados:
                asociar_ingredientes_demo(db, lote_demo, ingredientes_por_nombre, crear=crear)
            completar_origen_demo(db, crear, lote_demo, proveedores)
        comprobar_origen_demo(db, lote_demo)
