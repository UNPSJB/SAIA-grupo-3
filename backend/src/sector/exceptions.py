from src.exceptions import NotFound, BadRequest
from src.sector.constants import ErrorCode

class SectorNoEncontrado(NotFound):
    DETAIL = ErrorCode.SECTOR_NO_ENCONTRADO

class NombreDuplicado(BadRequest):
    DETAIL = ErrorCode.NOMBRE_DUPLICADO

class SectorTieneEquipos(BadRequest):
    DETAIL = ErrorCode.SECTOR_TIENE_EQUIPOS