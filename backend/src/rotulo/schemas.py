from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator

from src.rotulo.constants import CampoAutomatico, TipoRegistro, UnidadVidaUtil


def _texto(valor: object) -> object:
    if isinstance(valor, str):
        return valor.strip() or None
    return valor


class PersonaResumen(BaseModel):
    id: int
    nombre: str
    apellido: str

    model_config = ConfigDict(from_attributes=True)


class UnidadResumen(BaseModel):
    id: int
    sufijo: str
    tipo: str

    model_config = ConfigDict(from_attributes=True)


class BorradorDatos(BaseModel):
    model_config = ConfigDict(extra="forbid")

    denominacion_venta: Optional[str] = Field(default=None, max_length=200)
    lista_ingredientes: Optional[str] = Field(default=None, max_length=4000)
    identificacion_lote: Optional[str] = Field(default=None, max_length=100)
    contenido_neto: Optional[float] = Field(default=None, gt=0, allow_inf_nan=False)
    contenido_neto_unidad_id: Optional[int] = Field(default=None, gt=0)
    razon_social: Optional[str] = Field(default=None, max_length=200)
    domicilio: Optional[str] = Field(default=None, max_length=300)
    pais_origen: Optional[str] = Field(default=None, max_length=100)
    tipo_registro: Optional[TipoRegistro] = None
    numero_registro: Optional[str] = Field(default=None, max_length=60)
    numero_establecimiento: Optional[str] = Field(default=None, max_length=60)
    es_importado: bool = False
    importador_razon_social: Optional[str] = Field(default=None, max_length=200)
    importador_domicilio: Optional[str] = Field(default=None, max_length=300)
    vida_util_cantidad: Optional[int] = Field(default=None, gt=0, le=3650)
    vida_util_unidad: UnidadVidaUtil = UnidadVidaUtil.DIAS
    leyenda_duracion: Optional[str] = Field(default=None, max_length=150)
    requiere_instrucciones: bool = False
    instrucciones: Optional[str] = Field(default=None, max_length=2000)

    @field_validator(
        "denominacion_venta",
        "lista_ingredientes",
        "identificacion_lote",
        "razon_social",
        "domicilio",
        "pais_origen",
        "numero_registro",
        "numero_establecimiento",
        "importador_razon_social",
        "importador_domicilio",
        "leyenda_duracion",
        "instrucciones",
        mode="before",
    )
    @classmethod
    def limpiar(cls, valor: object) -> object:
        return _texto(valor)


class CampoAutomaticoEstado(BaseModel):
    campo: CampoAutomatico
    etiqueta: str
    valor: Optional[str] = None
    valor_sistema: Optional[str] = None
    origen: str
    editado: bool
    editado_por: Optional[PersonaResumen] = None
    editado_en: Optional[datetime] = None
    cambio_en_sistema: bool = False


class Edicion(BaseModel):
    id: int
    campo: CampoAutomatico
    etiqueta: str
    origen: str
    valor_sistema: Optional[str] = None
    valor_original: Optional[str] = None
    valor_nuevo: Optional[str] = None
    personal: PersonaResumen
    fecha_hora: datetime


class InformacionNutricionalResumen(BaseModel):
    receta_id: int
    version_id: int
    numero: int
    completa: bool
    faltantes: int
    calculada_en: datetime


class RotuladoFrontalResumen(BaseModel):
    resultado: Optional[str] = None
    mensaje: Optional[str] = None
    calculo_id: Optional[int] = None
    leyendas: list[str] = Field(default_factory=list)
    advertencias: list[str] = Field(default_factory=list)
    provisorio: bool = False
    conjunto_numero: Optional[int] = None
    conjunto_fecha_vigencia: Optional[date] = None
    calculado_en: Optional[datetime] = None


class Faltante(BaseModel):
    campo: str
    etiqueta: str
    seccion: str


class Completitud(BaseModel):
    porcentaje: int
    completos: int
    total: int
    faltantes: list[Faltante]


class ProductoResumen(BaseModel):
    id: int
    nombre: str
    activo: bool

    model_config = ConfigDict(from_attributes=True)


class Borrador(BaseModel):
    id: int
    producto: ProductoResumen
    denominacion_venta: Optional[str] = None
    lista_ingredientes: Optional[str] = None
    identificacion_lote: Optional[str] = None
    contenido_neto: Optional[float] = None
    contenido_neto_unidad: Optional[UnidadResumen] = None
    razon_social: Optional[str] = None
    domicilio: Optional[str] = None
    pais_origen: Optional[str] = None
    tipo_registro: Optional[TipoRegistro] = None
    numero_registro: Optional[str] = None
    numero_establecimiento: Optional[str] = None
    es_importado: bool
    importador_razon_social: Optional[str] = None
    importador_domicilio: Optional[str] = None
    vida_util_cantidad: Optional[int] = None
    vida_util_unidad: UnidadVidaUtil
    leyenda_duracion: str
    requiere_instrucciones: bool
    instrucciones: Optional[str] = None
    automaticos: list[CampoAutomaticoEstado]
    informacion_nutricional: Optional[InformacionNutricionalResumen] = None
    rotulado_frontal: Optional[RotuladoFrontalResumen] = None
    completitud: Completitud
    ediciones: list[Edicion]
    creado_por: PersonaResumen
    creado_en: datetime
    actualizado_por: PersonaResumen
    actualizado_en: datetime


class RotuloListado(BaseModel):
    producto: ProductoResumen
    borrador_id: Optional[int] = None
    porcentaje: Optional[int] = None
    faltantes: int = 0
    actualizado_en: Optional[datetime] = None
