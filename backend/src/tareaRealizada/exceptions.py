from src.tareaRealizada.constants import ErrorCode
from src.exceptions import NotFound

class TareaRealizadaNoEncontrada(NotFound):
    DETAIL = ErrorCode.TAREA_REALIZADA_NO_ENCONTRADA