from src.archivos.constants import ErrorCode
from src.exceptions import BadRequest, NotFound


class FormatoNoPermitido(BadRequest):
    def __init__(self, extensiones: set[str]) -> None:
        formatos = ", ".join(sorted(extension.lstrip(".").upper() for extension in extensiones))
        super().__init__(detail=f"{ErrorCode.FORMATO_NO_PERMITIDO} {formatos}.")


class ArchivoDemasiadoGrande(BadRequest):
    DETAIL = ErrorCode.ARCHIVO_DEMASIADO_GRANDE


class ArchivoNoEncontrado(NotFound):
    DETAIL = ErrorCode.ARCHIVO_NO_ENCONTRADO
