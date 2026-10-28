from enum import StrEnum

DIAS_POR_DEFECTO = 30
DIAS_MAXIMOS_RANGO = 366


class Agrupacion(StrEnum):
    DIA = "dia"
    SEMANA = "semana"


class ErrorCode:
    RANGO_INVALIDO = "La fecha desde no puede ser posterior a la fecha hasta."
    RANGO_DEMASIADO_GRANDE = f"El rango no puede superar los {DIAS_MAXIMOS_RANGO} días."
