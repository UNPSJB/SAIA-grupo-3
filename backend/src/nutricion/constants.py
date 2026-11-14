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
