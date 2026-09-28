from src.exceptions import NotFound, BadRequest
from src.consumoQuimico.constants import ErrorCode

class ConsumoNoEncontrado(NotFound):
    DETAIL = ErrorCode.CONSUMO_NO_ENCONTRADO

class CantidadInvalida(BadRequest):
    DETAIL = ErrorCode.CANTIDAD_INVALIDA

class StockInsuficiente(BadRequest):
    DETAIL = ErrorCode.STOCK_INSUFICIENTE