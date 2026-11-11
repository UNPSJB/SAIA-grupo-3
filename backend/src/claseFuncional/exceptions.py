from src.claseFuncional.constants import ErrorCode
from src.exceptions import BadRequest, NotFound


class ClaseFuncionalNoEncontrada(NotFound):
    DETAIL = ErrorCode.CLASE_NO_ENCONTRADA


class ClaseFuncionalDuplicada(BadRequest):
    DETAIL = ErrorCode.CLASE_DUPLICADA
