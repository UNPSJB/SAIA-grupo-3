from src.aditivoReferencia.constants import ErrorCode
from src.exceptions import BadRequest, NotFound


class AditivoNoEncontrado(NotFound):
    DETAIL = ErrorCode.ADITIVO_NO_ENCONTRADO


class AditivoDuplicado(BadRequest):
    DETAIL = ErrorCode.ADITIVO_DUPLICADO


class InsDuplicado(BadRequest):
    DETAIL = ErrorCode.INS_DUPLICADO


class InsObligatorio(BadRequest):
    DETAIL = ErrorCode.INS_OBLIGATORIO


class ClaseInactiva(BadRequest):
    DETAIL = ErrorCode.CLASE_INACTIVA
