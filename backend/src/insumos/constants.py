from enum import StrEnum, auto


class TipoInsumo(StrEnum):
    INGREDIENTE = auto()
    ADITIVO = auto()


class ErrorCode:
    INSUMO_NO_ENCONTRADO = "El insumo no fue encontrado."
    NOMBRE_VACIO = "El nombre del insumo está vacío."
    NOMBRE_DUPLICADO = "El nombre de este insumo ya existe"
    ADITIVO_SIN_REFERENCIA = "Un insumo de tipo aditivo debe indicar a qué aditivo de referencia corresponde."
    ADITIVO_REFERENCIA_INVALIDO = "El aditivo de referencia elegido no existe o está dado de baja."
