from typing import List
from src.insumos.constants import ErrorCode
from src.exceptions import NotFound, BadRequest

class InsumoNoEncontrado(NotFound):
    DETAIL = ErrorCode.INSUMO_NO_ENCONTRADO

class UnidadMedidaNoEncontrada(NotFound):
    DETAIL = ErrorCode.UNIDAD_MEDIDA_NO_ENCONTRADA

class NombreDuplicado(BadRequest):
    DETAIL = ErrorCode.NOMBRE_DUPLICADO

class TipoUnidadInvalido(ValueError):
    def _init_(self, posibles_tipos: List[str]):
        posibles_tipos = ", ".join(posibles_tipos)
        message = f"{ErrorCode.TIPO_UNIDAD_INVALIDO} {posibles_tipos}."
        super()._init_(message)