from src.documentoTecnico.constants import ErrorCode
from src.exceptions import NotFound, BadRequest

class DocumentoTecnicoNoEncontrado(NotFound):
    DETAIL = ErrorCode.DOCUMENTO_NO_ENCONTRADO

class VersionNoEncontrada(NotFound):
    DETAIL = ErrorCode.VERSION_NO_ENCONTRADA

class DocumentoArchivado(BadRequest):
    DETAIL = ErrorCode.DOCUMENTO_ARCHIVADO

class ArchivoRequerido(BadRequest):
    DETAIL = ErrorCode.ARCHIVO_REQUERIDO

class ArchivoNoPermitido(BadRequest):
    DETAIL = ErrorCode.ARCHIVO_NO_PERMITIDO

class ArchivoDemasiadoGrande(BadRequest):
    DETAIL = ErrorCode.ARCHIVO_DEMASIADO_GRANDE

class ArchivoNoDisponible(NotFound):
    DETAIL = ErrorCode.ARCHIVO_NO_DISPONIBLE
