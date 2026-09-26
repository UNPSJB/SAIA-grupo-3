from src.checklist.constants import ErrorCode
from src.exceptions import NotFound, BadRequest, PermissionDenied

class PersonalNoEncontrado(NotFound):
    DETAIL = ErrorCode.PERSONAL_NO_ENCONTRADO

class PersonalSinPermisoOperar(PermissionDenied):
    DETAIL = ErrorCode.PERSONAL_SIN_PERMISO_OPERAR

class PlanNoAsignado(NotFound):
    DETAIL = ErrorCode.PLAN_NO_ASIGNADO

class TareaNoPerteneceAlPlan(BadRequest):
    DETAIL = ErrorCode.TAREA_NO_PERTENECE_AL_PLAN

class TareaYaRealizada(BadRequest):
    DETAIL = ErrorCode.TAREA_YA_REALIZADA

class TareaNoRealizada(NotFound):
    DETAIL = ErrorCode.TAREA_NO_REALIZADA

class SoloAutorPuedeAnular(PermissionDenied):
    DETAIL = ErrorCode.SOLO_AUTOR_PUEDE_ANULAR

class MotivoRequerido(BadRequest):
    DETAIL = ErrorCode.MOTIVO_REQUERIDO