from src.exceptions import BadRequest, NotFound
from src.accionCorrectiva.constants import ErrorCode


class AccionCorrectivaNoEncontrada(NotFound):
    DETAIL = ErrorCode.ACCION_CORRECTIVA_NO_ENCONTRADA


class IncidenteYaCerrado(BadRequest):
    DETAIL = ErrorCode.INCIDENTE_YA_CERRADO


class IncidenteNoCerrado(BadRequest):
    DETAIL = ErrorCode.INCIDENTE_NO_CERRADO


class AccionNoVigente(BadRequest):
    DETAIL = ErrorCode.ACCION_NO_VIGENTE
