from enum import StrEnum, auto

from src.nutricion.constants import Nutriente


class EstadoConjunto(StrEnum):
    BORRADOR = auto()
    VIGENTE = auto()
    ARCHIVADO = auto()


class Sello(StrEnum):
    AZUCARES = auto()
    GRASAS_TOTALES = auto()
    GRASAS_SATURADAS = auto()
    SODIO = auto()
    CALORIAS = auto()


class Formula(StrEnum):
    PORCENTAJE_ENERGIA = auto()
    MG_POR_KCAL = auto()
    CANTIDAD_POR_100 = auto()


class Comparacion(StrEnum):
    MAYOR_O_IGUAL = auto()
    MAYOR = auto()


class AplicaA(StrEnum):
    SOLIDO = auto()
    LIQUIDO = auto()
    AMBOS = auto()


class TipoProducto(StrEnum):
    SOLIDO = auto()
    LIQUIDO = auto()


class Hecho(StrEnum):
    ENVASADO_AUSENCIA_CLIENTE = auto()
    AGREGA_AZUCARES = auto()
    AGREGA_GRASAS = auto()
    AGREGA_SODIO = auto()
    CONTIENE_EDULCORANTES = auto()
    CONTIENE_CAFEINA = auto()


AGREGADOS = (Hecho.AGREGA_AZUCARES, Hecho.AGREGA_GRASAS, Hecho.AGREGA_SODIO)
HECHOS_DE_RECETA = (*AGREGADOS, Hecho.CONTIENE_EDULCORANTES, Hecho.CONTIENE_CAFEINA)


class OperadorRegla(StrEnum):
    ALGUNO = auto()
    TODOS = auto()
    NINGUNO = auto()
    SIEMPRE = auto()


class ResultadoAplicabilidad(StrEnum):
    NO_CORRESPONDE = auto()
    EXCEPTUADO = auto()
    CORRESPONDE = auto()


NUTRIENTES_EVALUABLES = {
    Nutriente.ENERGIA,
    Nutriente.AZUCARES_TOTALES,
    Nutriente.AZUCARES_ANADIDOS,
    Nutriente.GRASAS_TOTALES,
    Nutriente.GRASAS_SATURADAS,
    Nutriente.GRASAS_TRANS,
    Nutriente.SODIO,
}

ETIQUETAS_HECHO = {
    Hecho.ENVASADO_AUSENCIA_CLIENTE: "se vende envasado en ausencia del cliente",
    Hecho.AGREGA_AZUCARES: "tiene azúcares añadidos",
    Hecho.AGREGA_GRASAS: "tiene grasas añadidas",
    Hecho.AGREGA_SODIO: "tiene sodio añadido",
    Hecho.CONTIENE_EDULCORANTES: "contiene edulcorantes",
    Hecho.CONTIENE_CAFEINA: "contiene cafeína",
}


class ErrorCode:
    MODULO_DESACTIVADO = "El módulo de rotulado frontal está desactivado."
    CONJUNTO_NO_ENCONTRADO = "El conjunto de parámetros no fue encontrado."
    SIN_VIGENTE = "No hay un conjunto de parámetros vigente: cargá los parámetros iniciales."
    NO_EDITABLE = "Solo se puede modificar un borrador. Para cambiar la versión {numero} creá una versión nueva."
    BORRADOR_EXISTENTE = "Ya hay un borrador (versión {numero}): terminalo o descartalo antes de crear otro."
    SIN_UMBRALES = "El conjunto debe tener al menos un umbral."
    SIN_REGLA_FINAL = "La última regla de aplicabilidad debe ser «siempre», para que todo producto tenga resultado."
    REGLA_SIN_HECHOS = "La regla {orden} necesita al menos un dato a evaluar."
    FACTOR_OBLIGATORIO = "El umbral {orden} usa proporción de energía: indicá el factor energético (kcal/g)."
    FECHA_OBLIGATORIA = "Indicá la fecha de vigencia antes de publicar."
    PRODUCTO_NO_ENCONTRADO = "El producto no fue encontrado."
    HECHO_NO_CORREGIBLE = "Solo se corrigen los agregados, los edulcorantes y la cafeína."
    SIN_APLICABILIDAD = "Primero evaluá si al producto le corresponde el rotulado frontal (pestaña Rotulado frontal)."
    NO_SE_CALCULA = "No se calculan sellos: {mensaje}"
    APLICABILIDAD_DESACTUALIZADA = "La evaluación de rotulado frontal está desactualizada: {motivo} Volvé a evaluarla antes de calcular."
    SIN_RECETA = "El producto no tiene receta vigente: no hay información nutricional para calcular sellos."
    CALCULO_NO_ENCONTRADO = "El cálculo de sellos no fue encontrado."


class Aviso:
    SIN_RECETA = "El producto no tiene receta vigente: no hay sugerencias, marcá los agregados a mano."
    PARAMETROS_NUEVOS = "Se publicó la versión {numero} de los parámetros: volvé a evaluar para usarla."
    RECETA_NUEVA = "La receta cambió desde la última evaluación (versión {numero}): revisá los agregados y volvé a evaluar."
    SUGERENCIAS_CAMBIARON = "Las sugerencias cambiaron desde la última evaluación: revisalas y volvé a evaluar."
    SELLOS_RECETA_NUEVA = "La receta vigente ahora es la versión {numero}: volvé a calcular los sellos."
    SELLOS_PARAMETROS_NUEVOS = "Los parámetros vigentes ahora son la versión {numero}: volvé a calcular los sellos."
    SELLOS_NUTRICION_NUEVA = "La información nutricional cambió después del cálculo: volvé a calcular los sellos."
    SELLOS_APLICABILIDAD_NUEVA = "La evaluación de rotulado frontal cambió después del cálculo: volvé a calcular los sellos."
