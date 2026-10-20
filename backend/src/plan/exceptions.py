from src.plan.constants import ErrorCode
from src.exceptions import NotFound, BadRequest

class PlanNoEncontrado(NotFound):
    DETAIL = ErrorCode.PLAN_NO_ENCONTRADO

class TareasNoEncontradas(BadRequest):
    DETAIL = ErrorCode.TAREAS_NO_ENCONTRADAS

class TareasRequeridas(BadRequest):
    DETAIL = ErrorCode.TAREAS_REQUERIDAS

class SectorNoExiste(BadRequest):
    DETAIL = ErrorCode.SECTOR_NO_EXISTE

class EquipoNoExiste(BadRequest):
    DETAIL = ErrorCode.EQUIPO_NO_EXISTE

class ResponsableNoValido(BadRequest):
    DETAIL = ErrorCode.RESPONSABLE_NO_VALIDO
