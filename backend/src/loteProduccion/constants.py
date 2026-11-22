from enum import StrEnum, auto

PREFIJO_CODIGO = "L"


class EstadoLote(StrEnum):
    ABIERTO = auto()
    EN_PRODUCCION = auto()
    FINALIZADO = auto()
    CERRADO = auto()
    ANULADO = auto()


ESTADOS_EN_CURSO = (EstadoLote.ABIERTO, EstadoLote.EN_PRODUCCION, EstadoLote.FINALIZADO)


class ErrorCode:
    LOTE_NO_ENCONTRADO = "El lote de producción no fue encontrado."
    FECHA_FUTURA = "La fecha de producción no puede ser posterior a hoy."
    PRODUCTO_INACTIVO = "El producto está dado de baja y no se le pueden registrar lotes."
    RANGO_FECHAS_INVALIDO = "La fecha desde no puede ser posterior a la fecha hasta."
    LOTE_CERRADO = "El lote está cerrado y no se puede modificar."
    LOTE_ANULADO = "El lote está anulado: no se puede modificar ni utilizar."
    LOTE_DADO_DE_BAJA = "El lote está dado de baja y no se puede anular."
    BAJA_CON_PRODUCCION_INICIADA = (
        "La producción del lote ya comenzó: no se puede dar de baja. Si hubo un problema, anulá el lote."
    )
    MOTIVO_ANULACION_OBLIGATORIO = "Indicá el motivo de la anulación."
    INSUMO_NO_ENCONTRADO = "Uno o más insumos seleccionados no existen."
    INSUMO_INACTIVO = "No se pueden asociar insumos dados de baja."
    INSUMO_DUPLICADO = "No se puede asociar el mismo insumo más de una vez al lote."
    VERSION_RECETA_NO_ENCONTRADA = "La versión de receta indicada no existe."
    RECETA_DE_OTRO_PRODUCTO = "La receta indicada es de otro producto."
    RECETA_DESACTUALIZADA = (
        "La receta cambió desde que la escalaste. Volvé a calcular las cantidades con la versión vigente."
    )
    FACTOR_RECETA_INCOMPLETO = "Para vincular el lote a una receta indicá la versión y el factor aplicado."
    PASOS_PENDIENTES = (
        "El lote tiene {cantidad} paso(s) sin realizar. Para cerrarlo igual, confirmá el cierre e indicá el motivo."
    )
    MOTIVO_CIERRE_OBLIGATORIO = "Indicá el motivo para cerrar el lote con pasos sin realizar."
    STOCK_INSUFICIENTE = "Uno o más insumos no tienen stock suficiente para las cantidades indicadas."
