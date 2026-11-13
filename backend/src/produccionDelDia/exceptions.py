from src.exceptions import BadRequest, NotFound
from src.produccionDelDia.constants import ErrorCode


class PasoNoEncontrado(NotFound):
    DETAIL = ErrorCode.PASO_NO_ENCONTRADO


class LoteNoEncontrado(NotFound):
    DETAIL = ErrorCode.LOTE_NO_ENCONTRADO


class LoteNoOperable(BadRequest):
    DETAIL = ErrorCode.LOTE_NO_OPERABLE


class PasoYaRealizado(BadRequest):
    DETAIL = ErrorCode.PASO_YA_REALIZADO


class PasoNoRealizado(BadRequest):
    DETAIL = ErrorCode.PASO_NO_REALIZADO


class ValorMedidoObligatorio(BadRequest):
    DETAIL = ErrorCode.VALOR_MEDIDO_OBLIGATORIO
