from enum import StrEnum, auto

FACTOR_KJ_POR_KCAL = 4.2


class Nutriente(StrEnum):
    ENERGIA = auto()
    CARBOHIDRATOS = auto()
    AZUCARES_TOTALES = auto()
    AZUCARES_ANADIDOS = auto()
    PROTEINAS = auto()
    GRASAS_TOTALES = auto()
    GRASAS_SATURADAS = auto()
    GRASAS_TRANS = auto()
    FIBRA = auto()
    SODIO = auto()


NUTRIENTES = {
    Nutriente.ENERGIA: ("Valor energético", "kcal", "energia_kcal"),
    Nutriente.CARBOHIDRATOS: ("Carbohidratos", "g", "carbohidratos_g"),
    Nutriente.AZUCARES_TOTALES: ("Azúcares totales", "g", "azucares_totales_g"),
    Nutriente.AZUCARES_ANADIDOS: ("Azúcares añadidos", "g", "azucares_anadidos_g"),
    Nutriente.PROTEINAS: ("Proteínas", "g", "proteinas_g"),
    Nutriente.GRASAS_TOTALES: ("Grasas totales", "g", "grasas_totales_g"),
    Nutriente.GRASAS_SATURADAS: ("Grasas saturadas", "g", "grasas_saturadas_g"),
    Nutriente.GRASAS_TRANS: ("Grasas trans", "g", "grasas_trans_g"),
    Nutriente.FIBRA: ("Fibra alimentaria", "g", "fibra_g"),
    Nutriente.SODIO: ("Sodio", "mg", "sodio_mg"),
}

NUTRIENTES_DE_ADITIVO = {Nutriente.ENERGIA, Nutriente.SODIO}


class FuenteNutricional(StrEnum):
    BASE_REFERENCIA = auto()
    ROTULO_PROVEEDOR = auto()
    BIBLIOGRAFIA = auto()
    VALOR_PROPIO = auto()


class AccionHistorial(StrEnum):
    COPIA_REFERENCIA = auto()
    CARGA_MANUAL = auto()
    MODIFICACION = auto()
    BORRADO = auto()
    REGISTRO_FUENTE = auto()


class TipoFaltante(StrEnum):
    INSUMO = auto()
    COMPOSICION = auto()
    RENDIMIENTO = auto()
    PORCION = auto()
    OTRO = auto()


class BaseCalculo(StrEnum):
    GRAMOS = "g"
    MILILITROS = "ml"


VALORES_DIARIOS_INICIALES = {
    Nutriente.ENERGIA: 2000,
    Nutriente.CARBOHIDRATOS: 300,
    Nutriente.AZUCARES_TOTALES: None,
    Nutriente.AZUCARES_ANADIDOS: None,
    Nutriente.PROTEINAS: 75,
    Nutriente.GRASAS_TOTALES: 55,
    Nutriente.GRASAS_SATURADAS: 22,
    Nutriente.GRASAS_TRANS: None,
    Nutriente.FIBRA: 25,
    Nutriente.SODIO: 2400,
}

REGLAS_INICIALES = {
    Nutriente.ENERGIA: (0, None, 4),
    Nutriente.CARBOHIDRATOS: (1, 10, 0.5),
    Nutriente.AZUCARES_TOTALES: (1, 10, None),
    Nutriente.AZUCARES_ANADIDOS: (1, 10, None),
    Nutriente.PROTEINAS: (1, 10, 0.5),
    Nutriente.GRASAS_TOTALES: (1, 10, 0.5),
    Nutriente.GRASAS_SATURADAS: (1, 10, 0.2),
    Nutriente.GRASAS_TRANS: (1, 10, 0.2),
    Nutriente.FIBRA: (1, 10, 0.5),
    Nutriente.SODIO: (1, 10, 5),
}

EXPRESION_NO_SIGNIFICATIVO_INICIAL = "0"
DECIMALES_VD_INICIAL = 0
LEYENDA_VD_INICIAL = "% Valores Diarios con base a una dieta de 2.000 kcal u 8.400 kJ."


COLUMNAS_CSV = ["codigo", "nombre", "grupo", *(campo for _, _, campo in NUTRIENTES.values())]


class ErrorCode:
    ALIMENTO_NO_ENCONTRADO = "El alimento de referencia no fue encontrado."
    INSUMO_NO_ENCONTRADO = "El insumo no fue encontrado."
    ADITIVO_SIN_APORTE = (
        "Este aditivo no tiene marcado que aporte energía o sodio: no lleva datos nutricionales. "
        "Marcalo en el insumo si su aporte es relevante."
    )
    NUTRIENTE_NO_PERMITIDO_ADITIVO = "En un aditivo solo se cargan el valor energético y el sodio."
    VALOR_NEGATIVO = "Los valores nutricionales no pueden ser negativos."
    AZUCARES_SUPERAN_CARBOHIDRATOS = "Los azúcares totales no pueden superar a los carbohidratos."
    ANADIDOS_SUPERAN_TOTALES = "Los azúcares añadidos no pueden superar a los azúcares totales."
    GRASAS_INCOHERENTES = "Las grasas saturadas más las trans no pueden superar a las grasas totales."
    VALOR_INEXISTENTE = "Ese valor todavía no está cargado: cargalo indicando su fuente."
    REFERENCIA_OBLIGATORIA = "Indicá el alimento de referencia del que se copian los valores."
    ARCHIVO_INVALIDO = "El archivo no es un CSV válido o le faltan columnas: {detalle}"
    FUENTE_BASE_SOLO_POR_COPIA = "La base de referencia se registra copiando los valores de un alimento."
    DETALLE_FUENTE_OBLIGATORIO = "Indicá el detalle de la fuente: de dónde sale el dato."
    VERSION_NO_ENCONTRADA = "La versión de receta no fue encontrada."
    REGLA_DUPLICADA = "Cada nutriente se configura una sola vez."
    REGLA_INCOMPLETA = "Faltan las reglas de: {nutrientes}."


class Faltante:
    COMPOSICION = "La composición de la receta está incompleta: completá las equivalencias en la pestaña Composición."
    RENDIMIENTO_SIN_FACTOR = "La unidad del rendimiento ('{unidad}') no tiene factor de conversión."
    RENDIMIENTO_EN_UNIDADES = (
        "El rendimiento está en '{unidad}': cargá en la versión el peso final del rendimiento (g) "
        "para poder llevar los valores a 100 g."
    )
    RENDIMIENTO_NO_MEDIBLE = "La unidad del rendimiento ('{unidad}') no es de peso, volumen ni unidades."
    PORCION_INCOMPATIBLE = (
        "La porción está en '{unidad}' y el rendimiento en {base}: declará la porción en {base} "
        "para calcular los valores por porción y el % VD."
    )
    INSUMO_SIN_DATOS = "no tiene cargado: {nutrientes}"
    INSUMO_SIN_FUENTE = "sin fuente registrada: {nutrientes}"
    INSUMO = "'{insumo}' {detalle}."
