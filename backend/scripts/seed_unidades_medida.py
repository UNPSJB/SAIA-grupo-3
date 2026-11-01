"""Unidades de medida utilizadas por los demás módulos."""

from src.unidadMedida.models import TipoUnidadMedida, UnidadMedida


def cargar_unidades_medida(crear):
    unidades = []
    definiciones = [(TipoUnidadMedida.UNIDAD, s) for s in ["un", "par", "caja", "paquete", "rollo"]]
    definiciones += [(TipoUnidadMedida.PESO, s) for s in ["mg", "g", "kg", "lb"]]
    definiciones += [(TipoUnidadMedida.CAPACIDAD, s) for s in ["ml", "L", "cc", "gal"]]
    definiciones += [(TipoUnidadMedida.LONGITUD, s) for s in ["cm", "m"]]
    for tipo, sufijo in definiciones:
        unidad, _ = crear(UnidadMedida, {"sufijo": sufijo}, tipo=tipo, activo=True)
        unidades.append(unidad)
    unidades_por_sufijo = {u.sufijo: u for u in unidades}

    return unidades, unidades_por_sufijo
