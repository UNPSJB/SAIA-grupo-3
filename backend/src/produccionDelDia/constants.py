from enum import StrEnum, auto


class EstadoPasoLote(StrEnum):
    PENDIENTE = auto()
    REALIZADO = auto()


class AccionPasoLote(StrEnum):
    REALIZADO = auto()
    ANULADO = auto()


class ErrorCode:
    PASO_NO_ENCONTRADO = "El paso no fue encontrado."
    LOTE_NO_ENCONTRADO = "El lote de producción no fue encontrado."
    LOTE_NO_OPERABLE = "El lote está cerrado o dado de baja: sus pasos ya no se pueden modificar."
    PASO_YA_REALIZADO = "Este paso ya está marcado como realizado."
    PASO_NO_REALIZADO = "Solo se puede anular un paso que esté marcado como realizado."
    VALOR_MEDIDO_OBLIGATORIO = "Este paso es un punto de control: indicá el valor medido."
    VALOR_MEDIDO_INVALIDO = "El valor medido debe ser un número."
    MOTIVO_OBLIGATORIO = "Indicá el motivo de la anulación."
