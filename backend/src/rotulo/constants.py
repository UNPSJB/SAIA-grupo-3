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
PAIS_ORIGEN_INICIAL = "Argentina"


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


class ErrorCode:
    PRODUCTO_NO_ENCONTRADO = "El producto no fue encontrado."
    BORRADOR_NO_ENCONTRADO = "El producto todavía no tiene borrador de rótulo."
    BORRADOR_EXISTENTE = "El producto ya tiene un borrador de rótulo."
    UNIDAD_CONTENIDO = "El contenido neto se expresa en una unidad de peso o de volumen."
    UNIDAD_NO_ENCONTRADA = "La unidad del contenido neto no fue encontrada."


class Origen:
    PRODUCTO = "del producto"
    RECETA = "de la receta v{numero}"
    RECETA_INCOMPLETA = "de la receta v{numero} (lista incompleta: revisá la composición)"
    SIN_RECETA = "sin receta vigente"
    LOTE = "del lote {codigo}"
    SIN_LOTE = "sin lotes registrados"
