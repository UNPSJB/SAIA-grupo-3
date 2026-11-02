"""Identifica el stock de fixtures sin aumentar su cantidad total."""
from datetime import date, timedelta
from uuid import uuid4

from src.abastecimiento.models import LoteRecepcionInsumo, Proveedor


def identificar_stock(db, persona, *insumos):
    proveedor = Proveedor(nombre="Proveedor de prueba", cuit="30123456789", activo=True)
    db.add(proveedor)
    db.flush()
    lotes = {}
    for insumo in insumos:
        cantidad = 50.0
        lote = LoteRecepcionInsumo(
            insumo_id=insumo.id, proveedor_id=proveedor.id,
            numero_lote=f"PRUEBA-{insumo.id}", cantidad=cantidad,
            cantidad_disponible=cantidad,
            fecha_recepcion=date.today() - timedelta(days=60),
            fecha_vencimiento=date.today() + timedelta(days=60),
            registrado_por_id=persona.id, clave_operacion=str(uuid4()),
            activo=True, conciliacion=True,
        )
        db.add(lote)
        db.flush()
        lotes[insumo.id] = lote.id
    db.commit()
    return lotes
