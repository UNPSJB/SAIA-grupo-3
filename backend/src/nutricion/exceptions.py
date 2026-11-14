from src.exceptions import BadRequest, NotFound
from src.nutricion.constants import ErrorCode


class AlimentoNoEncontrado(NotFound):
    DETAIL = ErrorCode.ALIMENTO_NO_ENCONTRADO


class InsumoNoEncontrado(NotFound):
    DETAIL = ErrorCode.INSUMO_NO_ENCONTRADO


class AditivoSinAporte(BadRequest):
    DETAIL = ErrorCode.ADITIVO_SIN_APORTE


class NutrienteNoPermitidoAditivo(BadRequest):
    DETAIL = ErrorCode.NUTRIENTE_NO_PERMITIDO_ADITIVO


class ValoresIncoherentes(BadRequest):
    pass


class ValorInexistente(BadRequest):
    DETAIL = ErrorCode.VALOR_INEXISTENTE


class ArchivoInvalido(BadRequest):
    def __init__(self, detalle: str) -> None:
        super().__init__(ErrorCode.ARCHIVO_INVALIDO.format(detalle=detalle))
