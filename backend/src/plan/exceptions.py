from src.plan.constants import ErrorCode
from src.exceptions import NotFound, BadRequest

class PlanNoEncontrado(NotFound):
    DETAIL = ErrorCode.PLAN_NO_ENCONTRADO

class TareasNoEncontradas(BadRequest):
    DETAIL = ErrorCode.TAREAS_NO_ENCONTRADAS
