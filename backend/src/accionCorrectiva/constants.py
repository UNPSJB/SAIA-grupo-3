class ErrorCode:
    ACCION_CORRECTIVA_NO_ENCONTRADA = "La acción correctiva no fue encontrada."
    INCIDENTE_YA_CERRADO = "El incidente ya está cerrado. Para registrar otra acción correctiva primero hay que reabrirlo."
    INCIDENTE_NO_CERRADO = "Solo se puede reabrir un incidente que esté cerrado."
    ACCION_NO_VIGENTE = "Solo se puede modificar la acción correctiva vigente (la del último cierre)."
    DESCRIPCION_REQUERIDA = "La descripción de la acción correctiva es obligatoria."
    MOTIVO_REAPERTURA_REQUERIDO = "El motivo de la reapertura es obligatorio."
