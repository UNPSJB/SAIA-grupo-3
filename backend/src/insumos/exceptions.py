from typing import List
from src.insumos.constants import ErrorCode
from src.exceptions import NotFound, BadRequest

class InsumoNoEncontrado(NotFound):
    DETAIL = ErrorCode.INSUMO_NO_ENCONTRADO

class NombreDuplicado(BadRequest):
    DETAIL = ErrorCode.NOMBRE_DUPLICADO

class NombreVacio(BadRequest):
    DETAIL = ErrorCode.NOMBRE_VACIO