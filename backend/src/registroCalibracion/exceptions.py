from src.exceptions import NotFound, BadRequest
from src.registroCalibracion.constants import ErrorCode


class RegistroCalibracionNoEncontrado(NotFound):
    DETAIL = ErrorCode.REGISTRO_NO_ENCONTRADO


class EquipoNoEncontrado(NotFound):
    DETAIL = ErrorCode.EQUIPO_NO_ENCONTRADO


class FechaCalibracionRequerida(BadRequest):
    DETAIL = ErrorCode.FECHA_CALIBRACION_REQUERIDA


class CertificadoRequerido(BadRequest):
    DETAIL = ErrorCode.CERTIFICADO_REQUERIDO


class FormatoArchivoInvalido(BadRequest):
    DETAIL = ErrorCode.FORMATO_ARCHIVO_INVALIDO