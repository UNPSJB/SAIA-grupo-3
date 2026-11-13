from typing import Optional

from src.unidadMedida.models import UnidadMedida


def convertir(cantidad: float, origen: UnidadMedida, destino: UnidadMedida) -> Optional[float]:
    if origen.id == destino.id:
        return cantidad
    if origen.tipo != destino.tipo or not origen.factor_base or not destino.factor_base:
        return None
    return cantidad * origen.factor_base / destino.factor_base
