from enum import StrEnum, auto


class EstadoIncidente(StrEnum):
    ABIERTO = auto()
    CERRADO = auto()


class ErrorCode:
    INCIDENTE_NO_ENCONTRADO = "El incidente no fue encontrado."
    OPERADOR_NO_VALIDO = "El reportante debe ser personal activo con permiso para operar."
