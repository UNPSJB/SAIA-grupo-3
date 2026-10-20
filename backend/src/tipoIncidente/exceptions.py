from src.tipoIncidente.constants import ErrorCode
from src.exceptions import NotFound, BadRequest


class TipoIncidenteNoEncontrado(NotFound):
    DETAIL = ErrorCode.TIPO_INCIDENTE_NO_ENCONTRADO


class TipoIncidenteDuplicado(BadRequest):
    DETAIL = ErrorCode.TIPO_INCIDENTE_DUPLICADO
