from enum import StrEnum, auto

PREFIJO_RUTA = "/recetas"
MOTIVO_VERSION_INICIAL = "Versión inicial"
DECIMALES_ESCALADO = 3


class EstadoVersionReceta(StrEnum):
    VIGENTE = auto()
    ARCHIVADA = auto()


class ErrorCode:
    RECETA_NO_ENCONTRADA = "La receta no fue encontrada."
    VERSION_NO_ENCONTRADA = "La versión de la receta no fue encontrada."
    PRODUCTO_SIN_RECETA = "El producto todavía no tiene receta."
    RECETA_EXISTENTE = "El producto ya tiene una receta. Para cambiarla, guardá una nueva versión."
    PRODUCTO_NO_ENCONTRADO = "El producto no fue encontrado."
    PRODUCTO_INACTIVO = "El producto está dado de baja y no admite nuevas versiones de receta."
    VERSION_ARCHIVADA = (
        "La versión {numero} está archivada y es de solo lectura. "
        "Los cambios se hacen sobre la versión vigente."
    )
    SIN_INGREDIENTES = "La receta debe tener al menos un ingrediente."
    INSUMO_REPETIDO = "El insumo '{nombre}' está repetido en la receta."
    INSUMO_INACTIVO = "El insumo '{nombre}' está dado de baja."
    TIPO_NO_COINCIDE = "El insumo '{nombre}' está cargado como {tipo} en el maestro de insumos."
    ADITIVO_SIN_CLASE = (
        "El aditivo '{nombre}' no tiene clase funcional: indicá su aditivo de referencia "
        "en el maestro de insumos."
    )
    UNIDAD_INVALIDA = "La unidad de medida indicada no existe o está dada de baja."
    EQUIPO_INVALIDO = "El equipo indicado en el paso '{nombre}' no existe o está dado de baja."
    PORCION_INCOMPLETA = "Para indicar la porción cargá la cantidad y la unidad."
    ESCALADO_SIN_PARAMETRO = "Indicá la cantidad objetivo o el factor multiplicador, pero no los dos."
