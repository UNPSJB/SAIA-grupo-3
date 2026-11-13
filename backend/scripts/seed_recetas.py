"""Clases funcionales, aditivos de referencia y recetas versionadas de demostración."""

from datetime import timedelta

from scripts.seed_abastecimiento import recibir_demo

from src.aditivoReferencia.models import AditivoReferencia
from src.claseFuncional.models import ClaseFuncional
from src.insumos.constants import TipoInsumo
from src.insumos.models import Insumo
from src.receta.composicion import calcular_composicion
from src.receta.constants import EstadoVersionReceta, MOTIVO_VERSION_INICIAL
from src.receta.models import PasoReceta, Receta, RenglonReceta, VersionReceta


CLASES = [
    "Acidulante", "Regulador de acidez", "Antiaglutinante", "Antiespumante", "Antioxidante",
    "Colorante", "Conservante", "Edulcorante", "Emulsionante", "Espesante", "Estabilizante",
    "Gelificante", "Humectante", "Leudante químico", "Resaltador del sabor", "Mejorador de harina",
    "Aromatizante",
]

ADITIVOS = [
    ("Ácido cítrico", "330", "Acidulante"),
    ("Citrato de sodio", "331(iii)", "Regulador de acidez"),
    ("Dióxido de silicio", "551", "Antiaglutinante"),
    ("Polidimetilsiloxano", "900a", "Antiespumante"),
    ("Ácido ascórbico", "300", "Antioxidante"),
    ("Caramelo IV", "150d", "Colorante"),
    ("Beta caroteno", "160a(i)", "Colorante"),
    ("Sorbato de potasio", "202", "Conservante"),
    ("Propionato de calcio", "282", "Conservante"),
    ("Sucralosa", "955", "Edulcorante"),
    ("Lecitina de soja", "322(i)", "Emulsionante"),
    ("Mono y diglicéridos de ácidos grasos", "471", "Emulsionante"),
    ("Goma xántica", "415", "Espesante"),
    ("Goma guar", "412", "Estabilizante"),
    ("Pectina", "440", "Gelificante"),
    ("Glicerol", "422", "Humectante"),
    ("Bicarbonato de sodio", "500(ii)", "Leudante químico"),
    ("Glutamato monosódico", "621", "Resaltador del sabor"),
    ("Aroma de vainilla", None, "Aromatizante"),
]

ADITIVOS_INSUMO = [
    ("Sorbato de potasio en polvo", "Sorbato de potasio", "g", 2000.0),
    ("Propionato de calcio en polvo", "Propionato de calcio", "g", 2000.0),
    ("Lecitina de soja líquida", "Lecitina de soja", "g", 1000.0),
    ("Polvo de hornear (bicarbonato)", "Bicarbonato de sodio", "g", 5000.0),
    ("Esencia de vainilla", "Aroma de vainilla", "ml", 1000.0),
    ("Mejorador panificador (ácido ascórbico)", "Ácido ascórbico", "g", 1000.0),
]

PASOS_PANIFICADOS = [
    ("Pesar ingredientes", "Pesar cada ingrediente según la receta y verificar la balanza.", 0, 10, None, False),
    ("Amasar", "Amasar hasta obtener una masa lisa y elástica.", 7, 15, None, False),
    ("Fermentar", "Dejar levar tapado en lugar templado hasta duplicar el volumen.", None, 60, 28, False),
    ("Hornear", "Hornear hasta dorar y verificar la cocción interna.", 6, 25, 200, True),
]

PASOS_BATIDOS = [
    ("Pesar ingredientes", "Pesar cada ingrediente según la receta y verificar la balanza.", 0, 10, None, False),
    ("Batir", "Batir huevos y azúcar hasta blanquear; incorporar los secos tamizados.", 8, 12, None, False),
    ("Hornear", "Hornear en molde enmantecado hasta que el palillo salga seco.", 6, 45, 170, True),
]

PASOS_COCIDOS = [
    ("Preparar ingredientes", "Lavar, pelar y cortar los ingredientes sobre la mesa de acero.", 5, 20, None, False),
    ("Cocinar", "Cocinar a fuego medio revolviendo hasta la textura indicada.", None, 40, 90, True),
    ("Enfriar y envasar", "Enfriar rápidamente y envasar rotulado con la fecha.", 9, 30, 4, True),
]

RECETAS = {
    "Pan de molde blanco": (20, "un", 50, "2 rebanadas", [("Harina de trigo", 6, "kg"), ("Agua", 3.6, "L"), ("Levadura", 180, "g"), ("Sal", 0.12, "kg"), ("Aceite", 0.18, "L"), ("Azúcar", 0.12, "kg")], [("Propionato de calcio en polvo", 18, "g"), ("Mejorador panificador (ácido ascórbico)", 6, "g")], PASOS_PANIFICADOS),
    "Pan francés": (10, "kg", 50, "1 pan chico", [("Harina de trigo", 6.5, "kg"), ("Agua", 3.9, "L"), ("Levadura", 130, "g"), ("Sal", 0.13, "kg")], [("Mejorador panificador (ácido ascórbico)", 6, "g")], PASOS_PANIFICADOS),
    "Facturas surtidas": (120, "un", 45, "1 factura", [("Harina de trigo", 5, "kg"), ("Leche", 2, "L"), ("Azúcar", 1, "kg"), ("Huevo", 0.6, "kg"), ("Levadura", 150, "g"), ("Sal", 0.05, "kg")], [("Esencia de vainilla", 20, "ml")], PASOS_PANIFICADOS),
    "Prepizza": (30, "un", 100, "1/4 de prepizza", [("Harina de trigo", 4, "kg"), ("Agua", 2.4, "L"), ("Levadura", 80, "g"), ("Aceite", 0.2, "L"), ("Sal", 0.08, "kg"), ("Tomate triturado", 1.5, "kg")], [("Sorbato de potasio en polvo", 4, "g")], PASOS_PANIFICADOS),
    "Tapas de empanada": (40, "paquete", 30, "1 tapa", [("Harina de trigo", 5, "kg"), ("Agua", 2.2, "L"), ("Aceite", 0.6, "L"), ("Sal", 0.1, "kg")], [("Sorbato de potasio en polvo", 5, "g")], PASOS_PANIFICADOS[:2]),
    "Masa de hojaldre": (8, "kg", 50, "1 porción", [("Harina de trigo", 4, "kg"), ("Agua", 2, "L"), ("Aceite", 1.5, "L"), ("Sal", 0.08, "kg")], [], PASOS_PANIFICADOS[:2]),
    "Galletitas de agua": (40, "paquete", 30, "6 galletitas", [("Harina de trigo", 7, "kg"), ("Agua", 2.5, "L"), ("Aceite", 0.9, "L"), ("Sal", 0.12, "kg"), ("Levadura", 70, "g")], [("Polvo de hornear (bicarbonato)", 60, "g")], PASOS_PANIFICADOS),
    "Budín de vainilla": (20, "un", 60, "1 rebanada", [("Harina de trigo", 2.5, "kg"), ("Azúcar", 2, "kg"), ("Huevo", 2, "kg"), ("Aceite", 1, "L"), ("Leche", 1, "L")], [("Polvo de hornear (bicarbonato)", 100, "g"), ("Esencia de vainilla", 40, "ml"), ("Sorbato de potasio en polvo", 8, "g")], PASOS_BATIDOS),
    "Torta de chocolate": (8, "un", 80, "1 porción", [("Harina de trigo", 1.6, "kg"), ("Azúcar", 1.6, "kg"), ("Huevo", 1.2, "kg"), ("Leche", 0.8, "L"), ("Aceite", 0.6, "L")], [("Polvo de hornear (bicarbonato)", 60, "g"), ("Lecitina de soja líquida", 10, "g")], PASOS_BATIDOS),
    "Alfajores de maicena": (50, "caja", 40, "1 alfajor", [("Harina de trigo", 1.5, "kg"), ("Azúcar", 0.8, "kg"), ("Huevo", 0.5, "kg"), ("Leche", 0.3, "L")], [("Polvo de hornear (bicarbonato)", 40, "g"), ("Esencia de vainilla", 15, "ml")], PASOS_BATIDOS),
    "Salsa de tomate": (20, "L", 60, "3 cucharadas", [("Tomate triturado", 20, "kg"), ("Cebolla", 2, "kg"), ("Aceite", 0.5, "L"), ("Sal", 0.2, "kg"), ("Azúcar", 0.1, "kg")], [("Sorbato de potasio en polvo", 20, "g")], PASOS_COCIDOS),
    "Dulce de leche repostero": (10, "kg", 20, "1 cucharada", [("Leche", 25, "L"), ("Azúcar", 5, "kg")], [("Polvo de hornear (bicarbonato)", 10, "g"), ("Sorbato de potasio en polvo", 10, "g")], PASOS_COCIDOS),
    "Empanadas de carne": (60, "un", 90, "1 empanada", [("Harina de trigo", 3, "kg"), ("Carne vacuna", 3, "kg"), ("Cebolla", 1.5, "kg"), ("Huevo", 0.5, "kg"), ("Aceite", 0.6, "L"), ("Sal", 0.08, "kg")], [], PASOS_COCIDOS),
    "Tarta de verduras": (10, "un", 150, "1 porción", [("Harina de trigo", 1.5, "kg"), ("Verduras para tarta", 3, "kg"), ("Huevo", 1, "kg"), ("Leche", 0.5, "L"), ("Aceite", 0.3, "L"), ("Sal", 0.04, "kg")], [], PASOS_COCIDOS),
    "Ñoquis de papa": (10, "kg", 250, "1 plato", [("Papa", 8, "kg"), ("Harina de trigo", 2.5, "kg"), ("Huevo", 0.5, "kg"), ("Sal", 0.06, "kg")], [], PASOS_COCIDOS[:2]),
}

SEGUNDA_VERSION = {
    "Pan francés": ("Ajuste de hidratación por cambio de harina", [("Agua", 4.0)]),
    "Budín de vainilla": ("Reducción de azúcar", [("Azúcar", 1.7)]),
}


def _cargar_aditivos(crear, unidades_por_sufijo):
    clases = {}
    for nombre in CLASES:
        clase, _ = crear(ClaseFuncional, {"nombre": nombre}, ins_opcional=nombre == "Aromatizante",
                         declarar_solo_funcion=nombre == "Aromatizante", activo=True)
        clases[nombre] = clase
    aditivos = {}
    for nombre, ins, clase in ADITIVOS:
        aditivo, _ = crear(AditivoReferencia, {"nombre": nombre}, ins=ins, clase_funcional_id=clases[clase].id, activo=True)
        aditivos[nombre] = aditivo
    insumos = {}
    for nombre, referencia, sufijo, _ in ADITIVOS_INSUMO:
        insumo, _ = crear(
            Insumo,
            {"nombre": nombre},
            unidad_medida_id=unidades_por_sufijo[sufijo].id,
            tipo=TipoInsumo.ADITIVO,
            aditivo_referencia_id=aditivos[referencia].id,
            activo=True,
        )
        insumos[nombre] = insumo
    return insumos


def _cargar_version(crear, receta, numero, estado, motivo, datos, ingredientes, aditivos, unidades, equipos, admin, cambios):
    rendimiento, sufijo_rendimiento, porcion, medida_casera, renglones, renglones_aditivos, pasos = datos
    version, _ = crear(
        VersionReceta,
        {"receta_id": receta.id, "numero": numero},
        estado=estado,
        motivo=motivo,
        rendimiento_cantidad=rendimiento,
        rendimiento_unidad_id=unidades[sufijo_rendimiento].id,
        porcion_cantidad=porcion,
        porcion_unidad_id=unidades["g"].id,
        porcion_medida_casera=medida_casera,
        creado_por_id=admin.id,
    )
    filas = [(ingredientes[nombre], cambios.get(nombre, cantidad), sufijo, TipoInsumo.INGREDIENTE) for nombre, cantidad, sufijo in renglones]
    filas += [(aditivos[nombre], cantidad, sufijo, TipoInsumo.ADITIVO) for nombre, cantidad, sufijo in renglones_aditivos]
    for orden, (insumo, cantidad, sufijo, tipo) in enumerate(filas, start=1):
        crear(
            RenglonReceta,
            {"version_id": version.id, "insumo_id": insumo.id},
            orden=orden,
            tipo=tipo,
            aditivo_referencia_id=insumo.aditivo_referencia_id,
            cantidad=cantidad,
            unidad_medida_id=unidades[sufijo].id,
        )
    for orden, (nombre, procedimiento, equipo, minutos, temperatura, control) in enumerate(pasos, start=1):
        crear(
            PasoReceta,
            {"version_id": version.id, "orden": orden},
            nombre=nombre,
            procedimiento=procedimiento,
            equipo_id=equipos[equipo].id if equipo is not None else None,
            tiempo_minutos=minutos,
            temperatura_celsius=temperatura,
            punto_control=control,
        )


def cargar_recepciones_aditivos(db, crear, aditivos, proveedores, actor, hoy):
    for i, (nombre, _, _, cantidad) in enumerate(ADITIVOS_INSUMO):
        recibir_demo(db, crear, aditivos[nombre], proveedores[i], cantidad,
            f"saia:seed:aditivos:recepcion:{nombre}", f"DEMO-ADT-{i + 1:03d}",
            actor, hoy - timedelta(days=30), hoy + timedelta(days=180))


def cargar_recetas(crear, productos, ingredientes, unidades_por_sufijo, equipos, admin):
    aditivos = _cargar_aditivos(crear, unidades_por_sufijo)
    recetas = []
    for producto in productos:
        datos = RECETAS[producto.nombre]
        receta, _ = crear(Receta, {"producto_id": producto.id})
        segunda = SEGUNDA_VERSION.get(producto.nombre)
        _cargar_version(
            crear, receta, 1,
            EstadoVersionReceta.ARCHIVADA if segunda else EstadoVersionReceta.VIGENTE,
            MOTIVO_VERSION_INICIAL, datos, ingredientes, aditivos, unidades_por_sufijo, equipos, admin, {},
        )
        if segunda:
            motivo, cambios = segunda
            _cargar_version(
                crear, receta, 2, EstadoVersionReceta.VIGENTE, motivo, datos,
                ingredientes, aditivos, unidades_por_sufijo, equipos, admin, dict(cambios),
            )
        recetas.append(receta)
    for receta in recetas:
        for version in receta.versiones:
            if version.composicion_calculada_en is None or not version.composicion_completa:
                calcular_composicion(version)
    return recetas, aditivos
