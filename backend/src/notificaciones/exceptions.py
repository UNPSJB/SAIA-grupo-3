from src.notificaciones.constants import ErrorCode
from src.exceptions import NotFound

class NotificacionNoEncontrada(NotFound):
    DETAIL = ErrorCode.NOTIFICACION_NO_ENCONTRADA
