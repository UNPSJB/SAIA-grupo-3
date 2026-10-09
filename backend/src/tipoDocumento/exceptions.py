from src.tipoDocumento.constants import ErrorCode
from src.exceptions import NotFound, BadRequest


class TipoDocumentoNoEncontrado(NotFound):
    DETAIL = ErrorCode.TIPO_DOCUMENTO_NO_ENCONTRADO


class TipoDocumentoDuplicado(BadRequest):
    DETAIL = ErrorCode.TIPO_DOCUMENTO_DUPLICADO
