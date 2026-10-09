from src.exceptions import BadRequest, NotFound
from src.incidente.constants import ErrorCode


class IncidenteNoEncontrado(NotFound):
    DETAIL = ErrorCode.INCIDENTE_NO_ENCONTRADO


class OperadorNoValido(BadRequest):
    DETAIL = ErrorCode.OPERADOR_NO_VALIDO
