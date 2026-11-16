from src.config import settings
from src.rotuladoFrontal.exceptions import ModuloDesactivado


def modulo_activo() -> bool:
    return bool(settings.ROTULADO_FRONTAL_ACTIVO)


def verificar_modulo_activo() -> None:
    if not modulo_activo():
        raise ModuloDesactivado()
