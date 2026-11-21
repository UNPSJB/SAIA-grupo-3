"""Borradores de rótulo de prueba para los productos con receta."""

from contextlib import contextmanager
from datetime import datetime

from sqlalchemy import select

from src.alergeno.models import Alergeno
from src.rotulo import alergenos
from src.rotulo.exportacion import registrar_exportacion
from src.rotulo.models import ExportacionRotulo
from src.rotuladoFrontal.aplicabilidad import version_vigente
from src.rotulo.constants import CampoAutomatico, CondicionConservacion, TipoRegistro, UnidadVidaUtil
from src.rotulo.models import BorradorRotulo, EdicionCampoRotulo
from src.rotulo.services import datos_del_sistema, meta_automatico, refrescar_automaticos
from src.unidadMedida.models import UnidadMedida

RAZON_SOCIAL = "DEMO Panificadora El Trigal S.R.L."
DOMICILIO = "DEMO - Av. de Prueba 1234, Luján, Buenos Aires"

CONTENIDOS = {
    "Pan de molde blanco": (500, "g", 7),
    "Pan francés": (1, "kg", 1),
    "Facturas surtidas": (540, "g", 2),
    "Prepizza": (400, "g", 10),
    "Tapas de empanada": (330, "g", 30),
    "Masa de hojaldre": (500, "g", 45),
    "Galletitas de agua": (250, "g", 120),
    "Budín de vainilla": (300, "g", 20),
    "Torta de chocolate": (1, "kg", 5),
    "Alfajores de maicena": (360, "g", 30),
    "Salsa de tomate": (500, "g", 180),
    "Dulce de leche repostero": (1, "kg", 90),
    "Empanadas de carne": (1, "kg", 3),
    "Tarta de verduras": (800, "g", 3),
    "Ñoquis de papa": (1, "kg", 4),
}
SIN_REGISTRO = {"Tarta de verduras", "Empanadas de carne", "Ñoquis de papa"}
CON_INSTRUCCIONES = {
    "Prepizza": "Precalentar el horno a 220 °C, agregar la cobertura y hornear 10 a 12 minutos.",
    "Tapas de empanada": "Rellenar, cerrar y hornear a 200 °C durante 20 minutos o freír.",
    "Ñoquis de papa": "Cocinar en abundante agua hirviendo con sal hasta que suban a la superficie.",
}

REFRIGERADOS = {"Tarta de verduras", "Empanadas de carne", "Ñoquis de papa", "Tapas de empanada", "Masa de hojaldre", "Prepizza"}
CONSERVACION = {
    "Tarta de verduras": (0, 5, 3, "Consumir dentro de las 24 h"),
    "Empanadas de carne": (0, 5, 3, None),
    "Ñoquis de papa": (0, 5, 4, None),
    "Tapas de empanada": (0, 8, 30, "Mantener refrigerado y consumir dentro de los 5 días"),
    "Masa de hojaldre": (0, 8, 45, None),
    "Prepizza": (2, 8, 10, None),
}
PUEDE_CONTENER = {
    "Facturas surtidas": ["Maní", "Nuez"],
    "Alfajores de maicena": ["Maní"],
    "Torta de chocolate": ["Almendra", "Avellana"],
    "Budín de vainilla": ["Nuez"],
    "Galletitas de agua": ["Soja"],
}
SIN_CONFIRMAR = {"Torta de chocolate", "Budín de vainilla", "Salsa de tomate"}


def cargar_rotulos(db, productos, admin):
    por_nombre = {a.nombre: a for a in db.scalars(select(Alergeno))}
    unidades = {u.sufijo: u for u in db.scalars(select(UnidadMedida)).all()}
    ahora = datetime.now()
    for indice, producto in enumerate(productos, start=1):
        if producto.nombre not in CONTENIDOS:
            continue
        existente = db.scalar(select(BorradorRotulo).where(BorradorRotulo.producto_id == producto.id))
        if existente is not None:
            if (
                existente.razon_social == RAZON_SOCIAL
                and existente.conservacion_condicion is None
                and existente.alergenos_confirmacion is None
            ):
                completar_alergenos(db, existente, producto.nombre, por_nombre, admin)
            continue
        cantidad, sufijo, vida_util = CONTENIDOS[producto.nombre]
        borrador = BorradorRotulo(
            producto_id=producto.id,
            contenido_neto=cantidad,
            contenido_neto_unidad_id=unidades[sufijo].id if sufijo in unidades else None,
            razon_social=RAZON_SOCIAL,
            domicilio=DOMICILIO,
            pais_origen="Argentina",
            tipo_registro=None if producto.nombre in SIN_REGISTRO else TipoRegistro.RPPA,
            numero_registro=None if producto.nombre in SIN_REGISTRO else f"DEMO-02-{100000 + indice}",
            numero_establecimiento="DEMO-02-000123",
            vida_util_cantidad=vida_util,
            vida_util_unidad=UnidadVidaUtil.DIAS,
            requiere_instrucciones=producto.nombre in CON_INSTRUCCIONES,
            instrucciones=CON_INSTRUCCIONES.get(producto.nombre),
            automaticos={},
            creado_por_id=admin.id,
            creado_en=ahora,
            actualizado_por_id=admin.id,
            actualizado_en=ahora,
        )
        sistema = datos_del_sistema(db, producto)
        refrescar_automaticos(borrador, sistema)
        valor_sistema, origen = sistema[CampoAutomatico.IDENTIFICACION_LOTE]
        borrador.ediciones.append(
            EdicionCampoRotulo(
                campo=CampoAutomatico.IDENTIFICACION_LOTE,
                origen=origen,
                valor_sistema=valor_sistema,
                valor_original=borrador.identificacion_lote,
                valor_nuevo="Ver envase",
                personal_id=admin.id,
                fecha_hora=ahora,
            )
        )
        borrador.identificacion_lote = "Ver envase"
        automaticos = dict(borrador.automaticos)
        automaticos[CampoAutomatico.IDENTIFICACION_LOTE.value] = meta_automatico(valor_sistema, origen, True, admin.id, ahora)
        borrador.automaticos = automaticos
        db.add(borrador)
        db.flush()
        completar_alergenos(db, borrador, producto.nombre, por_nombre, admin)
    db.flush()
    cargar_exportaciones(db, productos, admin)


@contextmanager
def sin_cerrar_transaccion(db):
    original = db.commit
    db.commit = db.flush
    try:
        yield
    finally:
        db.commit = original


def cargar_exportaciones(db, productos, admin):
    con_borrador = set(db.scalars(select(BorradorRotulo.producto_id)))
    exportados = set(db.scalars(select(ExportacionRotulo.producto_id)))
    with sin_cerrar_transaccion(db):
        for producto in productos:
            if producto.id in con_borrador and producto.id not in exportados and version_vigente(db, producto.id):
                registrar_exportacion(db, producto.id, admin)
    db.flush()


def completar_alergenos(db, borrador, nombre, por_nombre, admin):
    if nombre in REFRIGERADOS:
        minima, maxima, dias, abierto = CONSERVACION[nombre]
        borrador.conservacion_condicion = CondicionConservacion.REFRIGERADO
        borrador.conservacion_temp_min = minima
        borrador.conservacion_temp_max = maxima
        borrador.conservacion_duracion_cantidad = dias
        borrador.conservacion_abierto = abierto
    elif nombre != "Salsa de tomate":
        borrador.conservacion_condicion = CondicionConservacion.AMBIENTE
    borrador.puede_contener_ids = sorted(por_nombre[n].id for n in PUEDE_CONTENER.get(nombre, []))
    db.flush()
    if nombre not in SIN_CONFIRMAR and alergenos.armar_propuesta(db, borrador.producto_id).version is not None:
        alergenos.confirmar(db, borrador, admin)
    db.flush()
