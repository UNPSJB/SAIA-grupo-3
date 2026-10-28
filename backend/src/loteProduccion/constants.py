PREFIJO_CODIGO = "L"


class ErrorCode:
    LOTE_NO_ENCONTRADO = "El lote de producción no fue encontrado."
    FECHA_FUTURA = "La fecha de producción no puede ser posterior a hoy."
    PRODUCTO_INACTIVO = "El producto está dado de baja y no se le pueden registrar lotes."
    RANGO_FECHAS_INVALIDO = "La fecha desde no puede ser posterior a la fecha hasta."
