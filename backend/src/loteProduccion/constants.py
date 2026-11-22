from enum import StrEnum, auto

PREFIJO_CODIGO = "L"
PREFIJO_CODIGO_BARRAS = "20"
PRIMER_NUMERO_SIN_CODIGO = 9001


class EstadoLote(StrEnum):
    ABIERTO = auto()
    EN_PRODUCCION = auto()
    FINALIZADO = auto()
    CERRADO = auto()
    ANULADO = auto()


ESTADOS_EN_CURSO = (EstadoLote.ABIERTO, EstadoLote.EN_PRODUCCION, EstadoLote.FINALIZADO)

TOLERANCIA_PUNTO_CONTROL_CELSIUS = 2.0


class TipoAlerta(StrEnum):
    PUNTO_CONTROL_FUERA_DE_RANGO = auto()
    CALIBRACION_VENCIDA = auto()
    INSUMO_VENCIDO = auto()
    INSUMO_RECIBIDO_DESPUES = auto()
    INSUMO_SIN_ORIGEN = auto()
    CIERRE_CON_PASOS_PENDIENTES = auto()
    LOTE_ANULADO = auto()


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
    CODIGO_FORMATO_INVALIDO = (
        "El código no es válido: ingresá los 13 dígitos del código de barras "
        "o el código del lote (L-AAAAMMDD-NNN)."
    )
    CODIGO_PREFIJO_INVALIDO = "El código de barras no corresponde a un lote: debe empezar con 20."
    CODIGO_CONTROL_INVALIDO = (
        "El dígito verificador no es válido: se leyó {leido} y se esperaba {esperado}. "
        "Revisá el código en la etiqueta."
    )
    LOTE_INEXISTENTE = "No hay ningún lote con el código {codigo}."
