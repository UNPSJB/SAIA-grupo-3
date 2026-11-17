from src.alergeno.constants import ErrorCode
from src.exceptions import BadRequest, NotFound


class AlergenoNoEncontrado(NotFound):
    DETAIL = ErrorCode.ALERGENO_NO_ENCONTRADO


class AlergenoDuplicado(BadRequest):
    DETAIL = ErrorCode.ALERGENO_DUPLICADO


class AlergenosInvalidos(BadRequest):
    DETAIL = ErrorCode.ALERGENOS_INVALIDOS
