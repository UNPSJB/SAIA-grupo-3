from typing import List
from src.equipos.constants import ErrorCode
from src.exceptions import NotFound, BadRequest


class EquipoNoEncontrado(NotFound):
    DETAIL = ErrorCode.EQUIPO_NO_ENCONTRADO


class SectorNoEncontrado(NotFound):
    DETAIL = ErrorCode.SECTOR_NO_ENCONTRADO


class NumeroSerieDuplicado(BadRequest):
    DETAIL = ErrorCode.NUMERO_SERIE_DUPLICADO


class TipoEquipoInvalido(ValueError):
    def __init__(self, posibles_tipos: List[str]):
        posibles_tipos = ", ".join(posibles_tipos)
        message = f"{ErrorCode.TIPO_EQUIPO_INVALIDO} {posibles_tipos}."
        super().__init__(message)