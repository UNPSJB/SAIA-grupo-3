from src.exceptions import BadRequest
from src.tablero.constants import ErrorCode

class RangoInvalido(BadRequest):
    DETAIL = ErrorCode.RANGO_INVALIDO

class RangoDemasiadoGrande(BadRequest):
    DETAIL = ErrorCode.RANGO_DEMASIADO_GRANDE
