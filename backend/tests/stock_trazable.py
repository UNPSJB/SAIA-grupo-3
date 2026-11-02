"""Identifica el stock de fixtures sin aumentar su cantidad total."""
from datetime import date, timedelta
from uuid import uuid4

from src.abastecimiento.models import LoteRecepcionInsumo, Proveedor


def identificar_stock(db, persona, *insumos):
    proveedor = Proveedor(nombre="Proveedor de prueba", cuit="30123456789", activo=True)
    db.add(proveedor)
    db.flush()
    for insumo in insumos:
        db.add(LoteRecepcionInsumo(
            insumo_id=insumo.id, proveedor_id=proveedor.id,
            numero_lote=f"PRUEBA-{insumo.id}", cantidad=insumo.cantidad,
            cantidad_disponible=insumo.cantidad,
            fecha_recepcion=date.today() - timedelta(days=60),
            fecha_vencimiento=date.today() + timedelta(days=60),
            registrado_por_id=persona.id, clave_operacion=str(uuid4()),
            activo=True, conciliacion=True,
        ))
    db.commit()
