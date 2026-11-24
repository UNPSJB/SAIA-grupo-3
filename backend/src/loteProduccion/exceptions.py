from src.exceptions import BadRequest, NotFound
from src.loteProduccion.constants import ErrorCode


class LoteNoEncontrado(NotFound):
    DETAIL = ErrorCode.LOTE_NO_ENCONTRADO


class FechaFutura(BadRequest):
    DETAIL = ErrorCode.FECHA_FUTURA


class ProductoInactivo(BadRequest):
    DETAIL = ErrorCode.PRODUCTO_INACTIVO


class RangoFechasInvalido(BadRequest):
    DETAIL = ErrorCode.RANGO_FECHAS_INVALIDO


class LoteCerrado(BadRequest):
    DETAIL = ErrorCode.LOTE_CERRADO


class LoteAnulado(BadRequest):
    DETAIL = ErrorCode.LOTE_ANULADO


class LoteDadoDeBaja(BadRequest):
    DETAIL = ErrorCode.LOTE_DADO_DE_BAJA


class BajaConProduccionIniciada(BadRequest):
    DETAIL = ErrorCode.BAJA_CON_PRODUCCION_INICIADA


class MotivoAnulacionObligatorio(BadRequest):
    DETAIL = ErrorCode.MOTIVO_ANULACION_OBLIGATORIO


class InsumoNoEncontrado(NotFound):
    DETAIL = ErrorCode.INSUMO_NO_ENCONTRADO


class InsumoInactivo(BadRequest):
    DETAIL = ErrorCode.INSUMO_INACTIVO


class InsumoDuplicado(BadRequest):
    DETAIL = ErrorCode.INSUMO_DUPLICADO


class StockInsuficiente(BadRequest):
    DETAIL = ErrorCode.STOCK_INSUFICIENTE


class VersionRecetaNoEncontrada(NotFound):
    DETAIL = ErrorCode.VERSION_RECETA_NO_ENCONTRADA


class RecetaDeOtroProducto(BadRequest):
    DETAIL = ErrorCode.RECETA_DE_OTRO_PRODUCTO


class RecetaDesactualizada(BadRequest):
    DETAIL = ErrorCode.RECETA_DESACTUALIZADA


class LoteNoFinalizado(BadRequest):
    def __init__(self, cantidad: int) -> None:
        super().__init__(ErrorCode.LOTE_NO_FINALIZADO.format(cantidad=cantidad))


class CodigoFormatoInvalido(BadRequest):
    DETAIL = ErrorCode.CODIGO_FORMATO_INVALIDO


class CodigoPrefijoInvalido(BadRequest):
    DETAIL = ErrorCode.CODIGO_PREFIJO_INVALIDO


class CodigoControlInvalido(BadRequest):
    def __init__(self, leido: int, esperado: int) -> None:
        super().__init__(ErrorCode.CODIGO_CONTROL_INVALIDO.format(leido=leido, esperado=esperado))


class LoteInexistente(NotFound):
    def __init__(self, codigo: str) -> None:
        super().__init__(ErrorCode.LOTE_INEXISTENTE.format(codigo=codigo))


class InsumoFueraDeReceta(BadRequest):
    def __init__(self, nombres: list[str]) -> None:
        super().__init__(ErrorCode.INSUMO_FUERA_DE_RECETA.format(nombres=", ".join(nombres)))
