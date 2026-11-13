from typing import Optional

<<<<<<< HEAD
from src.unidadMedida.models import UnidadMedida
=======
from src.unidadMedida.models import TipoUnidadMedida, UnidadMedida

FACTORES_A_BASE = {
    TipoUnidadMedida.PESO: {"mg": 0.001, "g": 1.0, "kg": 1000.0, "lb": 453.59237},
    TipoUnidadMedida.CAPACIDAD: {"ml": 1.0, "cc": 1.0, "l": 1000.0, "gal": 3785.411784},
    TipoUnidadMedida.LONGITUD: {"cm": 1.0, "m": 100.0},
}
>>>>>>> dev


def convertir(cantidad: float, origen: UnidadMedida, destino: UnidadMedida) -> Optional[float]:
    if origen.id == destino.id:
        return cantidad
<<<<<<< HEAD
    if origen.tipo != destino.tipo or not origen.factor_base or not destino.factor_base:
        return None
    return cantidad * origen.factor_base / destino.factor_base
=======
    if origen.tipo != destino.tipo:
        return None
    factores = FACTORES_A_BASE.get(origen.tipo, {})
    factor_origen = factores.get(origen.sufijo.strip().lower())
    factor_destino = factores.get(destino.sufijo.strip().lower())
    if factor_origen is None or factor_destino is None:
        return None
    return cantidad * factor_origen / factor_destino
>>>>>>> dev
