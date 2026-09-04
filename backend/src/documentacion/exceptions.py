from typing import List
from src.documentacion.constants import ErrorCode
from src.exceptions import NotFound, BadRequest


class DocumentoNoEncontrado(NotFound):
    DETAIL = ErrorCode.DOCUMNTACION_NO_ENCONTRADA


class DocumentoDuplicado(BadRequest):
    DETAIL = ErrorCode.DOCUMENTO_DUPLICADO


class TipoDocumentacionInvalido(ValueError):
    def __init__(self, posibles_tipos: List[str]):
        posibles_tipos = ", ".join(posibles_tipos)
        message = f"{ErrorCode.TIPO_DOCUMENTO_INVALIDO} {posibles_tipos}."
        super().__init__(message)
