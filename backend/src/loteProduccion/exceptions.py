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


class InsumoNoEncontrado(NotFound):
    DETAIL = ErrorCode.INSUMO_NO_ENCONTRADO


class InsumoInactivo(BadRequest):
    DETAIL = ErrorCode.INSUMO_INACTIVO


class InsumoDuplicado(BadRequest):
    DETAIL = ErrorCode.INSUMO_DUPLICADO


class StockInsuficiente(BadRequest):
    DETAIL = ErrorCode.STOCK_INSUFICIENTE
