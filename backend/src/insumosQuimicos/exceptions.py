from typing import List
from src.exceptions import NotFound, BadRequest
from src.insumosQuimicos.constants import ErrorCode


class InsumoQuimicoNoEncontrado(NotFound):
    DETAIL = ErrorCode.INSUMO_QUIMICO_NO_ENCONTRADO


class NombreDuplicado(BadRequest):
    DETAIL = ErrorCode.NOMBRE_DUPLICADO


class CantidadInvalida(BadRequest):
    DETAIL = ErrorCode.CANTIDAD_INVALIDA


class TipoQuimicoInvalido(ValueError):
    def __init__(self, posibles_tipos: List[str]):
        posibles_tipos = ", ".join(posibles_tipos)
        message = f"{ErrorCode.TIPO_QUIMICO_INVALIDO} {posibles_tipos}."
        super().__init__(message)