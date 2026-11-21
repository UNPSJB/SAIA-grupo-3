from enum import StrEnum, auto


class TipoRegistro(StrEnum):
    RNPA = auto()
    RPPA = auto()


class UnidadVidaUtil(StrEnum):
    DIAS = auto()
    MESES = auto()


class CampoAutomatico(StrEnum):
    DENOMINACION_VENTA = auto()
    LISTA_INGREDIENTES = auto()
    IDENTIFICACION_LOTE = auto()


ETIQUETAS_AUTOMATICOS = {
    CampoAutomatico.DENOMINACION_VENTA: "Denominación de venta",
    CampoAutomatico.LISTA_INGREDIENTES: "Lista de ingredientes",
    CampoAutomatico.IDENTIFICACION_LOTE: "Identificación del lote",
}

LEYENDA_DURACION_INICIAL = "Consumir preferentemente antes del"
LEYENDA_BORRADOR = (
    "BORRADOR: debe ser revisado por un/a profesional y por la autoridad sanitaria competente antes de su uso"
)
PAIS_ORIGEN_INICIAL = "Argentina"


class EstadoDeclaracion(StrEnum):
    SUGERIDA = auto()
    CONFIRMADA = auto()


class CondicionConservacion(StrEnum):
    AMBIENTE = auto()
    REFRIGERADO = auto()
    CONGELADO = auto()


ETIQUETAS_CONSERVACION = {
    CondicionConservacion.AMBIENTE: "Conservar en lugar fresco y seco",
    CondicionConservacion.REFRIGERADO: "Conservar refrigerado",
    CondicionConservacion.CONGELADO: "Conservar congelado",
}


class AdvertenciaVistaPrevia:
    FALTANTES = "Faltan {cantidad} datos obligatorios: el rótulo todavía no está listo para revisión."
    FALTANTE_UNO = "Falta 1 dato obligatorio: el rótulo todavía no está listo para revisión."
    TABLA_INCOMPLETA = "La tabla nutricional está incompleta ({cantidad} datos faltantes en la receta v{numero})."
    SIN_TABLA = "El producto no tiene receta vigente: no hay tabla nutricional."
    SELLOS_PROVISORIOS = "Los sellos se calcularon con información nutricional incompleta (provisorios)."


class Aviso:
    RECETA_CAMBIO = "La receta cambió después de confirmar la declaración (v{anterior} → v{actual}). Revisala y volvé a confirmarla."
    MARCAS_CAMBIO = "Cambiaron las marcas de alérgenos de los ingredientes después de confirmar. Revisá la declaración y volvé a confirmarla."
    PUEDE_CONTENER_CAMBIO = "Se modificó la posible contaminación cruzada. Volvé a confirmar la declaración."
    GLUTEN_SIN_CEREAL = "Hay ingredientes marcados con gluten (TACC) sin un cereal asociado: indicá en el insumo de qué cereal proviene."


class Seccion:
    DENOMINACION = "Denominación de venta"
    INGREDIENTES = "Lista de ingredientes"
    CONTENIDO = "Contenido neto"
    ORIGEN = "Identificación del origen"
    LOTE = "Identificación del lote"
    DURACION = "Fecha de duración"
    INSTRUCCIONES = "Preparación e instrucciones de uso"
    NUTRICIONAL = "Información nutricional"
    FRONTAL = "Rotulado frontal"
    ALERGENOS = "Alérgenos y conservación"


class ErrorCode:
    PRODUCTO_NO_ENCONTRADO = "El producto no fue encontrado."
    BORRADOR_NO_ENCONTRADO = "El producto todavía no tiene borrador de rótulo."
    BORRADOR_EXISTENTE = "El producto ya tiene un borrador de rótulo."
    UNIDAD_CONTENIDO = "El contenido neto se expresa en una unidad de peso o de volumen."
    UNIDAD_NO_ENCONTRADA = "La unidad del contenido neto no fue encontrada."
    SIN_RECETA_ALERGENOS = "El producto no tiene receta vigente: no se puede confirmar la declaración de alérgenos."
    TEMPERATURAS = "La temperatura mínima no puede ser mayor que la máxima."
    DURACION_SIN_CONDICION = "Indicá la condición de conservación a la que corresponde la duración."
    EXPORTACION_SIN_RECETA = "El producto no tiene receta vigente: no hay cálculos que respalden el rótulo."
    EXPORTACION_NO_ENCONTRADA = "La exportación no fue encontrada."
    TEXTO_NO_PERMITIDO = (
        "El contenido a exportar menciona {menciones}. Un borrador no puede llevar menciones de "
        "aprobación, conformidad o certificación: corregilo antes de exportar."
    )


class Origen:
    PRODUCTO = "del producto"
    RECETA = "de la receta v{numero}"
    RECETA_INCOMPLETA = "de la receta v{numero} (lista incompleta: revisá la composición)"
    SIN_RECETA = "sin receta vigente"
    LOTE = "del lote {codigo}"
    SIN_LOTE = "sin lotes registrados"


ETIQUETAS_FUENTE = {
    "base_referencia": "Base de referencia",
    "rotulo_proveedor": "Rótulo del proveedor",
    "bibliografia": "Bibliografía",
    "valor_propio": "Valor propio (análisis)",
}

PALABRAS_NO_PERMITIDAS = (
    r"\b(aprobad\w*|aprobaci\w*|aprueba\w*|conformes?\b|conformidad\w*|certificad\w*|certificaci\w*"
    r"|certifica\b|homologad\w*|homologaci\w*)"
)
REFERENCIA_NORMATIVA = r"\baprobad[oa]s? por (la |el )?(disposici[oó]n|resoluci[oó]n|decreto|ley)\b"

ETIQUETAS_CAMPOS = {
    "denominacion_venta": "Denominación de venta",
    "lista_ingredientes": "Lista de ingredientes",
    "identificacion_lote": "Identificación del lote",
    "razon_social": "Razón social",
    "domicilio": "Domicilio",
    "pais_origen": "País de origen",
    "numero_registro": "Número de registro",
    "numero_establecimiento": "Registro del establecimiento",
    "importador_razon_social": "Razón social del importador",
    "importador_domicilio": "Domicilio del importador",
    "leyenda_duracion": "Leyenda de duración",
    "instrucciones": "Instrucciones de uso",
    "conservacion_abierto": "Conservación una vez abierto",
    "leyenda_conservacion": "Conservación",
    "nombre": "Nombre",
    "motivo": "Motivo",
    "detalle_fuente": "Detalle de la fuente",
    "porcion_medida_casera": "Medida casera",
}
