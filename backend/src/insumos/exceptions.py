from typing import List
from src.insumos.constants import ErrorCode
from src.exceptions import NotFound, BadRequest

class InsumoNoEncontrado(NotFound):
    DETAIL = ErrorCode.INSUMO_NO_ENCONTRADO

class NombreDuplicado(BadRequest):
    DETAIL = ErrorCode.NOMBRE_DUPLICADO

class AditivoSinReferencia(BadRequest):
    DETAIL = ErrorCode.ADITIVO_SIN_REFERENCIA

class AditivoReferenciaInvalido(BadRequest):
    DETAIL = ErrorCode.ADITIVO_REFERENCIA_INVALIDO

class NombreVacio(BadRequest):
    DETAIL = ErrorCode.NOMBRE_VACIO
