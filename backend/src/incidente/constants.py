from enum import StrEnum, auto


# Estadísticas: período por defecto y máximo que se puede consultar.
DIAS_ESTADISTICAS_POR_DEFECTO = 30
DIAS_ESTADISTICAS_MAXIMO = 731  # dos años


class AgrupacionPeriodo(StrEnum):
    DIA = auto()
    SEMANA = auto()
    MES = auto()


class EstadoIncidente(StrEnum):
    ABIERTO = auto()
    CERRADO = auto()


class ErrorCode:
    INCIDENTE_NO_ENCONTRADO = "El incidente no fue encontrado."
    OPERADOR_NO_VALIDO = "El reportante debe ser personal activo con permiso para operar."
    RANGO_FECHAS_INVALIDO = "La fecha desde no puede ser posterior a la fecha hasta."
    RANGO_FECHAS_EXCEDIDO = "El período consultado no puede superar los dos años."
