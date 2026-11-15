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


class VersionNoEncontrada(NotFound):
    DETAIL = ErrorCode.VERSION_NO_ENCONTRADA


class ReglaDuplicada(BadRequest):
    DETAIL = ErrorCode.REGLA_DUPLICADA


class ReglasIncompletas(BadRequest):
    def __init__(self, nutrientes: str) -> None:
        super().__init__(ErrorCode.REGLA_INCOMPLETA.format(nutrientes=nutrientes))
