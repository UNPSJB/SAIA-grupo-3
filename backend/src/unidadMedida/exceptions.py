from typing import List
from src.unidadMedida.constants import ErrorCode
from src.exceptions import NotFound, BadRequest

class UnidadMedidaNoEncontrada(NotFound):
    DETAIL = ErrorCode.UNIDAD_MEDIDA_NO_ENCONTRADA

class TipoUnidadInvalido(ValueError):
    def _init_(self, posibles_tipos: List[str]):
        posibles_tipos = ", ".join(posibles_tipos)
        message = f"{ErrorCode.TIPO_UNIDAD_INVALIDO} {posibles_tipos}."
        super()._init_(message)