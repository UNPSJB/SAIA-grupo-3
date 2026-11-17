"""Borradores de rótulo de prueba para los productos con receta."""

from datetime import datetime

from sqlalchemy import select

from src.rotulo.constants import CampoAutomatico, TipoRegistro, UnidadVidaUtil
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


def cargar_rotulos(db, productos, admin):
    unidades = {u.sufijo: u for u in db.scalars(select(UnidadMedida)).all()}
    ahora = datetime.now()
    for indice, producto in enumerate(productos, start=1):
        if producto.nombre not in CONTENIDOS:
            continue
        if db.scalar(select(BorradorRotulo.id).where(BorradorRotulo.producto_id == producto.id)):
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
