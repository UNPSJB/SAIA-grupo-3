from enum import StrEnum, auto

PREFIJO_CODIGO = "L"


class EstadoLote(StrEnum):
    ABIERTO = auto()
    CERRADO = auto()


class ErrorCode:
    LOTE_NO_ENCONTRADO = "El lote de producción no fue encontrado."
    FECHA_FUTURA = "La fecha de producción no puede ser posterior a hoy."
    PRODUCTO_INACTIVO = "El producto está dado de baja y no se le pueden registrar lotes."
    RANGO_FECHAS_INVALIDO = "La fecha desde no puede ser posterior a la fecha hasta."
    LOTE_CERRADO = "El lote está cerrado y no se puede modificar."
    INSUMO_NO_ENCONTRADO = "Uno o más insumos seleccionados no existen."
    INSUMO_INACTIVO = "No se pueden asociar insumos dados de baja."
    INSUMO_DUPLICADO = "No se puede asociar el mismo insumo más de una vez al lote."
