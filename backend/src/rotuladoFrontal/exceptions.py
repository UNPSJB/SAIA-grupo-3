from fastapi import status

from src.exceptions import BadRequest, DetailedHTTPException, NotFound
from src.rotuladoFrontal.constants import ErrorCode


class ModuloDesactivado(DetailedHTTPException):
    STATUS_CODE = status.HTTP_503_SERVICE_UNAVAILABLE
    DETAIL = ErrorCode.MODULO_DESACTIVADO


class ConjuntoNoEncontrado(NotFound):
    DETAIL = ErrorCode.CONJUNTO_NO_ENCONTRADO


class SinConjuntoVigente(NotFound):
    DETAIL = ErrorCode.SIN_VIGENTE


class ConjuntoNoEditable(BadRequest):
    def __init__(self, numero: int) -> None:
        super().__init__(ErrorCode.NO_EDITABLE.format(numero=numero))


class BorradorExistente(BadRequest):
    def __init__(self, numero: int) -> None:
        super().__init__(ErrorCode.BORRADOR_EXISTENTE.format(numero=numero))


class ConjuntoInvalido(BadRequest):
    pass


class CalculoNoPermitido(BadRequest):
    pass


class CalculoNoEncontrado(NotFound):
    DETAIL = ErrorCode.CALCULO_NO_ENCONTRADO


class ProductoNoEncontrado(NotFound):
    DETAIL = ErrorCode.PRODUCTO_NO_ENCONTRADO
