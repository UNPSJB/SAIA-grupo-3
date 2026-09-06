from src.personal.constants import ErrorCode
from src.exceptions import NotFound, BadRequest


class PersonalNoEncontrado(NotFound):
    DETAIL = ErrorCode.PERSONAL_NO_ENCONTRADO


class EmailDuplicado(BadRequest):
    DETAIL = ErrorCode.EMAIL_DUPLICADO


class DniDuplicado(BadRequest):
    DETAIL = ErrorCode.DNI_DUPLICADO

class NroLegajoDuplicado(BadRequest):
    DETAIL = ErrorCode.NRO_LEGAJO_DUPLICADO 


class PersonalTieneDocumentacion(BadRequest):
    DETAIL = ErrorCode.PERSONAL_TIENE_DOCUMENTACION
