from collections import defaultdict
from datetime import datetime, time, timedelta
from math import ceil
from uuid import NAMESPACE_URL, uuid5

from scripts.panificadora import datos
from src.abastecimiento.models import LoteRecepcionInsumo, Proveedor

DIAS_PREVIOS = 49
MARGEN = 1.15
FRECUENCIA_ADITIVOS = 28


def _cuit(candidato):
    while True:
        base = f"30{candidato:08d}"
        candidato += 1
        digito = (11 - sum(int(n) * p for n, p in zip(base, (5, 4, 3, 2, 7, 6, 5, 4, 3, 2))) % 11) % 11
        if digito != 10:
            return base + str(digito), candidato


def cargar_proveedores(crear, hoy):
    proveedores = {}
    candidato = 71245000
    for i, (clave, (nombre, _, dias_habilitacion, activo)) in enumerate(datos.PROVEEDORES.items(), start=1):
        cuit, candidato = _cuit(candidato)
        usuario = nombre.split()[0].lower()
        proveedor, _ = crear(Proveedor, {"cuit": cuit}, nombre=nombre,
            telefono=f"011 4{600 + i:03d}-{1200 + i * 37:04d}",
            email=f"ventas.{usuario}{i:02d}@proveedor.example",
            numero_habilitacion=f"RNE 02-0{45210 + i * 113}",
            vencimiento_habilitacion=hoy + timedelta(days=dias_habilitacion), activo=activo)
        proveedores[clave] = proveedor
    return proveedores


def _recibir(crear, insumo, proveedor, prefijo, cantidad, fecha, vence, actor, numero, activo=True):
    clave = str(uuid5(NAMESPACE_URL, f"panificadora:recepcion:{insumo.nombre}:{fecha.isoformat()}:{numero}"))
    crear(LoteRecepcionInsumo, {"clave_operacion": clave}, insumo_id=insumo.id, proveedor_id=proveedor.id,
        numero_lote=f"{prefijo}-{fecha:%y%m%d}-{numero:02d}", cantidad=cantidad,
        cantidad_disponible=cantidad, fecha_recepcion=fecha, fecha_vencimiento=vence,
        registrado_por_id=actor.id, fecha_registro=datetime.combine(fecha, time(7 + numero // 60, numero % 60)),
        activo=activo, conciliacion=False)


def _necesidades(planificados):
    consumo = defaultdict(lambda: defaultdict(float))
    for lote in planificados:
        for nombre, cantidad in lote["consumo"]:
            consumo[nombre][lote["fecha"]] += cantidad
    return consumo


def _cantidad(consumo, desde, dias, paquete):
    necesidad = sum(c for f, c in consumo.items() if desde <= f < desde + timedelta(days=dias))
    return max(paquete, ceil(necesidad * MARGEN / paquete) * paquete)


def cargar_recepciones(crear, proveedores, generales, ingredientes, aditivos, planificados, actor, hoy):
    consumo = _necesidades(planificados)
    inicio = hoy - timedelta(days=DIAS_PREVIOS)
    for numero, (nombre, _, _, _, vida, frecuencia, paquete, clave) in enumerate(datos.INGREDIENTES, start=1):
        proveedor = proveedores[clave]
        fecha = inicio
        while fecha <= hoy:
            cantidad = _cantidad(consumo[nombre], fecha, frecuencia, paquete)
            _recibir(crear, ingredientes[nombre], proveedor, datos.PROVEEDORES[clave][1], cantidad,
                fecha, fecha + timedelta(days=vida), actor, numero)
            fecha += timedelta(days=frecuencia)
    for numero, (nombre, (paquete, vida)) in enumerate(datos.ADITIVOS_RECEPCION.items(), start=40):
        fecha = inicio
        while fecha <= hoy:
            cantidad = _cantidad(consumo[nombre], fecha, FRECUENCIA_ADITIVOS, paquete)
            _recibir(crear, aditivos[nombre], proveedores["aditivos"], datos.PROVEEDORES["aditivos"][1],
                cantidad, fecha, fecha + timedelta(days=vida), actor, numero)
            fecha += timedelta(days=FRECUENCIA_ADITIVOS)
    for numero, (nombre, _, cantidad, _, dias) in enumerate(datos.INSUMOS_GENERALES, start=60):
        proveedor = proveedores["higiene"] if numero >= 68 else proveedores["envases"]
        fecha = hoy - timedelta(days=dias)
        _recibir(crear, generales[nombre], proveedor, datos.PROVEEDORES["higiene" if numero >= 68 else "envases"][1],
            cantidad, fecha, fecha + timedelta(days=720), actor, numero)
    rechazo = hoy - timedelta(days=25)
    _recibir(crear, ingredientes["Huevo líquido pasteurizado"], proveedores["granja"], datos.PROVEEDORES["granja"][1],
        60.0, rechazo, rechazo + timedelta(days=21), actor, 99, activo=False)
