from src.exceptions import BadRequest, NotFound
from src.receta.constants import ErrorCode


class RecetaNoEncontrada(NotFound):
    DETAIL = ErrorCode.RECETA_NO_ENCONTRADA


class VersionNoEncontrada(NotFound):
    DETAIL = ErrorCode.VERSION_NO_ENCONTRADA


class ProductoSinReceta(NotFound):
    DETAIL = ErrorCode.PRODUCTO_SIN_RECETA


class ProductoNoEncontrado(NotFound):
    DETAIL = ErrorCode.PRODUCTO_NO_ENCONTRADO


class RecetaExistente(BadRequest):
    DETAIL = ErrorCode.RECETA_EXISTENTE


class ProductoInactivo(BadRequest):
    DETAIL = ErrorCode.PRODUCTO_INACTIVO


class VersionArchivada(BadRequest):
    def __init__(self, numero: int) -> None:
        super().__init__(ErrorCode.VERSION_ARCHIVADA.format(numero=numero))


class InsumoRepetido(BadRequest):
    def __init__(self, nombre: str) -> None:
        super().__init__(ErrorCode.INSUMO_REPETIDO.format(nombre=nombre))


class InsumoInactivo(BadRequest):
    def __init__(self, nombre: str) -> None:
        super().__init__(ErrorCode.INSUMO_INACTIVO.format(nombre=nombre))


class TipoNoCoincide(BadRequest):
    def __init__(self, nombre: str, tipo: str) -> None:
        super().__init__(ErrorCode.TIPO_NO_COINCIDE.format(nombre=nombre, tipo=tipo))


class AditivoSinClase(BadRequest):
    def __init__(self, nombre: str) -> None:
        super().__init__(ErrorCode.ADITIVO_SIN_CLASE.format(nombre=nombre))


class EscaladoSinParametro(BadRequest):
    DETAIL = ErrorCode.ESCALADO_SIN_PARAMETRO


class UnidadInvalida(BadRequest):
    DETAIL = ErrorCode.UNIDAD_INVALIDA


class EquipoInvalido(BadRequest):
    def __init__(self, nombre: str) -> None:
        super().__init__(ErrorCode.EQUIPO_INVALIDO.format(nombre=nombre))
