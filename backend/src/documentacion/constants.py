from enum import StrEnum, auto

# Con cuántos días de anticipación un documento se considera "por vencer"
DIAS_AVISO_VENCIMIENTO = 30


class EstadoVencimiento(StrEnum):
    VENCIDO = auto()
    POR_VENCER = auto()
    VIGENTE = auto()


class ErrorCode:
    DOCUMENTACION_NO_ENCONTRADA = "La documentacion no fue encontrada."
    DOCUMENTO_DUPLICADO = "El documento ingresado ya existe."
