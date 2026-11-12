"""Unidades de medida utilizadas por los demás módulos."""

from src.unidadMedida.models import TipoUnidadMedida, UnidadMedida

FACTORES_BASE = {
    "un": 1.0, "par": 2.0,
    "mg": 0.001, "g": 1.0, "kg": 1000.0, "lb": 453.59237,
    "ml": 1.0, "L": 1000.0, "cc": 1.0, "gal": 3785.411784,
    "cm": 1.0, "m": 100.0,
}


def cargar_unidades_medida(crear):
    unidades = []
    definiciones = [(TipoUnidadMedida.UNIDAD, s) for s in ["un", "par", "caja", "paquete", "rollo"]]
    definiciones += [(TipoUnidadMedida.PESO, s) for s in ["mg", "g", "kg", "lb"]]
    definiciones += [(TipoUnidadMedida.CAPACIDAD, s) for s in ["ml", "L", "cc", "gal"]]
    definiciones += [(TipoUnidadMedida.LONGITUD, s) for s in ["cm", "m"]]
    for tipo, sufijo in definiciones:
        unidad, _ = crear(UnidadMedida, {"sufijo": sufijo}, tipo=tipo, activo=True,
            factor_base=FACTORES_BASE.get(sufijo))
        unidades.append(unidad)
    unidades_por_sufijo = {u.sufijo: u for u in unidades}

    return unidades, unidades_por_sufijo
