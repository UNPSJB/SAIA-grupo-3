from src.exceptions import BadRequest
from src.perfil.constants import ErrorCode


class PasswordActualIncorrecta(BadRequest):
    DETAIL = ErrorCode.PASSWORD_ACTUAL_INCORRECTA


class PasswordIgualALaActual(BadRequest):
    DETAIL = ErrorCode.PASSWORD_IGUAL_A_LA_ACTUAL


class EmailDuplicado(BadRequest):
    DETAIL = ErrorCode.EMAIL_DUPLICADO
