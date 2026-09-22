from src.tarea.constants import ErrorCode
from src.exceptions import NotFound

class TareaNoEncontrada(NotFound):
    DETAIL = ErrorCode.TAREA_NO_ENCONTRADA