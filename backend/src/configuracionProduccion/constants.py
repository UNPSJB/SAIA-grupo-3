from enum import StrEnum, auto


class FormatoAditivos(StrEnum):
    FUNCION_NOMBRE = auto()
    FUNCION_INS = auto()
    FUNCION_NOMBRE_INS = auto()


FORMATO_POR_DEFECTO = FormatoAditivos.FUNCION_NOMBRE_INS
