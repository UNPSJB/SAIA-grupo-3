from src.planRealizado.constants import ErrorCode
from src.exceptions import NotFound

class PlanRealizadoNoEncontrado(NotFound):
    DETAIL = ErrorCode.PLAN_REALIZADO_NO_ENCONTRADO