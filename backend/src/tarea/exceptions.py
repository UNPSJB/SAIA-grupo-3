from src.tarea.constants import ErrorCode
from src.exceptions import NotFound, BadRequest

class TareaNoEncontrada(NotFound):
    DETAIL = ErrorCode.TAREA_NO_ENCONTRADA

class EquipoNoExiste(BadRequest):
    DETAIL = ErrorCode.EQUIPO_NO_EXISTE

class InsumosQuimicosNoEncontrados(BadRequest):
    DETAIL = ErrorCode.INSUMOS_QUIMICOS_NO_ENCONTRADOS
