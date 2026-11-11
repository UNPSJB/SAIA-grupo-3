from src.areas.constants import ErrorCode
from src.exceptions import BadRequest


class NombreUsadoPorInsumoQuimico(BadRequest):
    DETAIL = ErrorCode.NOMBRE_USADO_POR_INSUMO_QUIMICO


class NombreUsadoPorIngrediente(BadRequest):
    DETAIL = ErrorCode.NOMBRE_USADO_POR_INGREDIENTE


class NoEsIngrediente(BadRequest):
    DETAIL = ErrorCode.NO_ES_INGREDIENTE
