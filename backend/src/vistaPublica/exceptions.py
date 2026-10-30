from src.exceptions import NotFound
from src.vistaPublica.constants import ErrorCode


class VistaPublicaNoDisponible(NotFound):
    DETAIL = ErrorCode.VISTA_PUBLICA_NO_DISPONIBLE