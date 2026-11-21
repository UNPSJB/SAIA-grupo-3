from src.exceptions import BadRequest, NotFound
from src.rotulo.constants import ErrorCode


class ProductoNoEncontrado(NotFound):
    DETAIL = ErrorCode.PRODUCTO_NO_ENCONTRADO


class BorradorNoEncontrado(NotFound):
    DETAIL = ErrorCode.BORRADOR_NO_ENCONTRADO


class BorradorExistente(BadRequest):
    DETAIL = ErrorCode.BORRADOR_EXISTENTE


class UnidadContenidoInvalida(BadRequest):
    DETAIL = ErrorCode.UNIDAD_CONTENIDO


class UnidadNoEncontrada(NotFound):
    DETAIL = ErrorCode.UNIDAD_NO_ENCONTRADA


class SinRecetaParaAlergenos(BadRequest):
    DETAIL = ErrorCode.SIN_RECETA_ALERGENOS


class ExportacionSinReceta(BadRequest):
    DETAIL = ErrorCode.EXPORTACION_SIN_RECETA


class ExportacionNoEncontrada(NotFound):
    DETAIL = ErrorCode.EXPORTACION_NO_ENCONTRADA


class TextoNoPermitido(BadRequest):
    DETAIL = ErrorCode.TEXTO_NO_PERMITIDO
