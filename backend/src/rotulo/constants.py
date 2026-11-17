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


class Origen:
    PRODUCTO = "del producto"
    RECETA = "de la receta v{numero}"
    RECETA_INCOMPLETA = "de la receta v{numero} (lista incompleta: revisá la composición)"
    SIN_RECETA = "sin receta vigente"
    LOTE = "del lote {codigo}"
    SIN_LOTE = "sin lotes registrados"
