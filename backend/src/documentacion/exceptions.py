from src.documentacion.constants import ErrorCode
from src.exceptions import NotFound, BadRequest


class DocumentoNoEncontrado(NotFound):
    DETAIL = ErrorCode.DOCUMENTACION_NO_ENCONTRADA


class DocumentoDuplicado(BadRequest):
    DETAIL = ErrorCode.DOCUMENTO_DUPLICADO
