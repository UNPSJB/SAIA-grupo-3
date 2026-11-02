"""Proveedores, recepciones y trazabilidad de abastecimiento de demostración."""

from datetime import datetime, time, timedelta
from uuid import NAMESPACE_URL, uuid5

from sqlalchemy import select

from scripts.seed_common import CANTIDAD
from scripts.seed_insumos import INGREDIENTES
from scripts.seed_lotes_produccion import (
    asociar_ingredientes_demo, completar_origen_demo, comprobar_origen_demo,
)
from src.abastecimiento.models import LoteRecepcionInsumo, Proveedor
from src.insumos.models import Insumo
from src.loteProduccion.constants import EstadoLote
from src.loteProduccion.models import LoteProduccion
from src.producto.models import Producto


def recibir_demo(db, crear, insumo, proveedor, cantidad, clave, numero, actor, fecha, vence):
    """Un ingreso ficticio explícito, estable e independiente del stock anterior."""
    clave = str(uuid5(NAMESPACE_URL, clave))
    existente = db.scalar(select(LoteRecepcionInsumo).where(
        LoteRecepcionInsumo.clave_operacion == clave))
    if existente is not None:
        return
    if not proveedor.activo or not insumo.activo:
        raise RuntimeError("No se puede agregar una recepción demo nueva con proveedor o insumo inactivo.")
    _, nueva = crear(LoteRecepcionInsumo, {"clave_operacion": clave},
        insumo_id=insumo.id, proveedor_id=proveedor.id, numero_lote=numero,
        cantidad=cantidad, cantidad_disponible=cantidad, fecha_recepcion=fecha,
        fecha_vencimiento=vence, registrado_por_id=actor,
        fecha_registro=datetime.combine(fecha, time(9)), activo=True, conciliacion=False)
    if nueva:
        insumo.cantidad += cantidad
        db.flush()


def cargar_recepciones_ingredientes(db, crear, ingredientes, proveedores, actor, hoy):
    # En bases existentes no identifica ni reemplaza saldos anteriores: son nuevos
    # ingresos de demostración, registrados una sola vez y con origen ficticio explícito.
    for i, (nombre, _, cantidad) in enumerate(INGREDIENTES):
        recibir_demo(db, crear, ingredientes[nombre], proveedores[i], cantidad,
            f"saia:seed:ingredientes:recepcion:{nombre}", f"DEMO-BASE-{i + 1:03d}",
            actor, hoy - timedelta(days=45), hoy + timedelta(days=90))


def cargar_abastecimiento_demo(db, crear, unidades_por_sufijo, registrado_por_id, hoy):
    """Escenarios identificados como DEMO; no reescribe registros ni reinicia saldos."""
    proveedores = []
    candidato = 99000000
    rubros = ["Molino", "Distribuidora", "Alimentos", "Levaduras", "Aceites"]
    for i in range(CANTIDAD):
        # CUITs sintéticos con dígito verificador, sin representar empresas reales.
        while True:
            base = f"30{candidato:08d}"
            candidato += 1
            digito = (11 - sum(int(n) * p for n, p in zip(base, (5, 4, 3, 2, 7, 6, 5, 4, 3, 2))) % 11) % 11
            if digito != 10:
                break
        proveedor, _ = crear(Proveedor, {"cuit": base + str(digito)},
            nombre=f"DEMO - {rubros[i % len(rubros)]} del establecimiento {i + 1:02d}",
            telefono=f"0000-0000-{i + 1:02d}", email=f"seed.proveedor{i + 1:02d}@example.com",
            numero_habilitacion=f"DEMO-HAB-{i + 1:03d}",
            vencimiento_habilitacion=hoy + timedelta(days=[-7, 0, 7, 60, 180][i % 5]),
            activo=i < CANTIDAD - 2)
        proveedores.append(proveedor)

    definiciones = [
        ("Harina de trigo", "kg", 50.0), ("Azúcar", "kg", 20.0),
        ("Levadura", "g", 500.0), ("Aceite", "L", 10.0), ("Sal", "kg", 5.0),
    ]
    ingredientes = {}
    for nombre, sufijo, _ in definiciones + [("Agua de amasado", "L", 20)]:
        nombre_demo = f"{nombre} · DEMO abastecimiento"
        insumo, _ = crear(Insumo, {"nombre": nombre_demo},
            cantidad=0.0,
            unidad_medida_id=unidades_por_sufijo[sufijo].id, activo=True)
        if insumo.unidad_medida_id != unidades_por_sufijo[sufijo].id:
            raise RuntimeError(f"La unidad de {nombre_demo} cambió. El seed no la sobrescribe.")
        ingredientes[nombre] = insumo

    for i in range(CANTIDAD):
        nombre, _, cantidad = definiciones[i % len(definiciones)]
        grupo = i // len(definiciones)
        if grupo == 1 and nombre == "Harina de trigo":
            cantidad = 15.0  # Queda agotado después de las 15 producciones demo.
        clave = str(uuid5(NAMESPACE_URL, f"saia:seed:abastecimiento:recepcion:{i + 1}"))
        existente = db.scalar(select(LoteRecepcionInsumo).where(LoteRecepcionInsumo.clave_operacion == clave))
        if existente is not None:
            continue
        proveedor = proveedores[i % (CANTIDAD - 2)]
        insumo = ingredientes[nombre]
        if not proveedor.activo or not insumo.activo:
            raise RuntimeError("No se puede agregar una recepción demo nueva con proveedor o insumo inactivo.")
        activo = i != CANTIDAD - 1  # Una recepción anulada, sin consumo ni stock agregado.
        recepcion, nueva = crear(LoteRecepcionInsumo, {"clave_operacion": clave},
            insumo_id=insumo.id, proveedor_id=proveedor.id,
            numero_lote=f"DEMO-REC-{i + 1:03d}", cantidad=cantidad, cantidad_disponible=cantidad,
            fecha_recepcion=hoy - timedelta(days=45),
            fecha_vencimiento=hoy + timedelta(days=[-10, 5, 60][grupo]),
            registrado_por_id=registrado_por_id,
            fecha_registro=datetime.combine(hoy - timedelta(days=45), time(9, i)),
            activo=activo, conciliacion=False)
        if nueva and recepcion.activo:
            insumo.cantidad += recepcion.cantidad
            db.flush()

    recibir_demo(db, crear, ingredientes["Agua de amasado"], proveedores[0], 20.0,
        "saia:seed:abastecimiento:agua-identificada", "DEMO-AGUA-001",
        registrado_por_id, hoy - timedelta(days=45), hoy + timedelta(days=60))

    producto, _ = crear(Producto, {"nombre": "Pan francés · DEMO abastecimiento"},
        descripcion="Producción ficticia para probar recepción, vencimientos y trazabilidad.",
        unidad_medida_id=unidades_por_sufijo["kg"].id, activo=True)
    receta = [("Harina de trigo", 1.0), ("Agua de amasado", 0.6),
              ("Levadura", 20.0), ("Sal", 0.02)]

    # Una producción ficticia anterior al vencimiento permite consultar también
    # el historial de la primera recepción, aunque hoy su saldo esté vencido.
    primera_recepcion = db.scalar(select(LoteRecepcionInsumo).where(
        LoteRecepcionInsumo.clave_operacion == str(uuid5(
            NAMESPACE_URL, "saia:seed:abastecimiento:recepcion:1"))))
    fecha_historica = primera_recepcion.fecha_vencimiento - timedelta(days=1)
    historico, nuevo = crear(LoteProduccion, {"codigo": "L-ABAST-HIST-001"},
        producto_id=producto.id, fecha_produccion=fecha_historica, cantidad=1.5,
        observaciones="DEMO: producción ficticia realizada antes del vencimiento de DEMO-REC-001.",
        registrado_por_id=registrado_por_id,
        fecha_registro=datetime.combine(fecha_historica, time(10)),
        activo=True, estado=EstadoLote.CERRADO,
        fecha_cierre=datetime.combine(fecha_historica, time(12)),
        cerrado_por_id=registrado_por_id)
    if historico.producto_id != producto.id or historico.registrado_por_id != registrado_por_id:
        raise RuntimeError(f"El código demo {historico.codigo} está ocupado por otro registro.")
    if nuevo:
        asociar_ingredientes_demo(db, historico, ingredientes, receta=receta, crear=crear)
    comprobar_origen_demo(db, historico)

    for i in range(CANTIDAD):
        fecha = hoy - timedelta(days=i % 7)
        lote, nuevo = crear(LoteProduccion, {"codigo": f"L-ABAST-SEED-{i + 1:03d}"},
            producto_id=producto.id, fecha_produccion=fecha, cantidad=1.5,
            observaciones="DEMO: todos los ingredientes provienen de recepciones identificadas ficticias.",
            registrado_por_id=registrado_por_id, fecha_registro=datetime.combine(fecha, time(10, i)),
            activo=True, estado=EstadoLote.CERRADO if i % 2 else EstadoLote.ABIERTO,
            fecha_cierre=datetime.combine(fecha, time(12)) if i % 2 else None,
            cerrado_por_id=registrado_por_id if i % 2 else None)
        if nuevo:
            asociar_ingredientes_demo(db, lote, ingredientes, receta=receta, crear=crear)
        else:
            if lote.producto_id != producto.id or lote.registrado_por_id != registrado_por_id:
                raise RuntimeError(f"El código demo {lote.codigo} está ocupado por otro registro.")
            if not lote.insumos_asociados:
                asociar_ingredientes_demo(db, lote, ingredientes, receta=receta, crear=crear)
            completar_origen_demo(db, crear, lote, proveedores)
        comprobar_origen_demo(db, lote)

    return proveedores
