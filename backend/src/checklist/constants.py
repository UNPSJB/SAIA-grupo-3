class ErrorCode:
    PERSONAL_NO_ENCONTRADO = "El personal no existe o no está activo."
    PERSONAL_SIN_PERMISO_OPERAR = "El personal seleccionado no tiene permiso de operar."
    PLAN_NO_ASIGNADO = "El plan no existe, no está activo o no está asignado a este personal."
    TAREA_NO_PERTENECE_AL_PLAN = "La tarea indicada no pertenece al plan."
    TAREA_YA_REALIZADA = "La tarea ya fue realizada en el período actual."
    TAREA_NO_REALIZADA = "La tarea no tiene un registro de realización en el período actual."
    SOLO_AUTOR_PUEDE_ANULAR = "Solo quien marcó la tarea puede anular su realización."
    MOTIVO_REQUERIDO = "Debe indicar el motivo de la anulación."
