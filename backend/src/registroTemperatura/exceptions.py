from src.registroTemperatura.constants import ErrorCode
from src.exceptions import NotFound, BadRequest

class RegistroNoEncontrado(NotFound):
    DETAIL = ErrorCode.REGISTRO_NO_ENCONTRADO

class EquipoNoControlaTemp(BadRequest):
    DETAIL = ErrorCode.EQUIPO_NO_CONTROLA_TEMP

class AccionRequerida(BadRequest):
    DETAIL = ErrorCode.ACCION_REQUERIDA