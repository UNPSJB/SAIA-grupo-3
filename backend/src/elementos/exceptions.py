from src.elementos.constants import ErrorCode
from src.exceptions import NotFound


class ElementoNoEncontrado(NotFound):
    DETAIL = ErrorCode.ELEMENTO_NO_ENCONTRADO
