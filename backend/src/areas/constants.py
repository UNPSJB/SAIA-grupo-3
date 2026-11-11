from enum import StrEnum, auto


class Area(StrEnum):
    PRODUCCION = auto()
    LIMPIEZA = auto()


class ErrorCode:
    NOMBRE_USADO_POR_INSUMO_QUIMICO = (
        "Ya existe un insumo químico de limpieza con ese nombre. "
        "Los insumos químicos no se pueden cargar como ingredientes de producción."
    )
    NOMBRE_USADO_POR_INGREDIENTE = (
        "Ya existe un ingrediente de producción con ese nombre. "
        "Los ingredientes no se pueden cargar como insumos químicos de limpieza."
    )
    NO_ES_INGREDIENTE = (
        "Solo se pueden usar ingredientes de producción. "
        "Los insumos químicos pertenecen al área de Limpieza."
    )
