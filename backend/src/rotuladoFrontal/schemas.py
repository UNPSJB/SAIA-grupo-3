import math
from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from src.nutricion.constants import Nutriente
from src.rotuladoFrontal.constants import (
    AGREGADOS,
    HECHOS_DE_RECETA,
    NUTRIENTES_EVALUABLES,
    AplicaA,
    Comparacion,
    EstadoConjunto,
    Formula,
    Hecho,
    OperadorRegla,
    ResultadoAplicabilidad,
    Sello,
    TipoProducto,
)


def _texto(valor: object) -> object:
    return valor.strip() if isinstance(valor, str) else valor


def _texto_opcional(valor: object) -> object:
    if isinstance(valor, str):
        return valor.strip() or None
    return valor


class PersonaResumen(BaseModel):
    id: int
    nombre: str
    apellido: str

    model_config = ConfigDict(from_attributes=True)


class UmbralDatos(BaseModel):
    model_config = ConfigDict(extra="forbid")

    sello: Sello
    leyenda: str = Field(min_length=1, max_length=60)
    nutriente: Nutriente
    formula: Formula
    factor_energetico: Optional[float] = Field(default=None, gt=0, allow_inf_nan=False)
    limite: float = Field(ge=0, allow_inf_nan=False)
    unidad: str = Field(min_length=1, max_length=30)
    comparacion: Comparacion = Comparacion.MAYOR_O_IGUAL
    aplica_a: AplicaA = AplicaA.AMBOS
    requiere_agregado: Optional[Hecho] = None
    requiere_alguno_de: list[Sello] = Field(default_factory=list)
    energia_maxima_porcion: Optional[float] = Field(default=None, ge=0, allow_inf_nan=False)
    nota: Optional[str] = Field(default=None, max_length=300)

    @field_validator("leyenda", "unidad", mode="before")
    @classmethod
    def limpiar(cls, valor: object) -> object:
        return _texto(valor)
    @field_validator("nota", mode="before")
    @classmethod
    def limpiar_nota(cls, valor: object) -> object:
        return _texto_opcional(valor)

    @field_validator("nutriente")
    @classmethod
    def validar_nutriente(cls, nutriente: Nutriente) -> Nutriente:
        if nutriente not in NUTRIENTES_EVALUABLES:
            raise ValueError("Ese nutriente no se evalúa en el rotulado frontal.")
        return nutriente

    @field_validator("requiere_agregado")
    @classmethod
    def validar_agregado(cls, hecho: Optional[Hecho]) -> Optional[Hecho]:
        if hecho is not None and hecho not in AGREGADOS:
            raise ValueError("La condición de agregado debe ser azúcares, grasas o sodio añadidos.")
        return hecho

    @model_validator(mode="after")
    def validar_formula(self) -> "UmbralDatos":
        if self.formula == Formula.PORCENTAJE_ENERGIA and self.factor_energetico is None:
            raise ValueError("Un umbral por proporción de energía necesita el factor energético (kcal/g).")
        if self.formula != Formula.PORCENTAJE_ENERGIA:
            self.factor_energetico = None
        if self.sello in self.requiere_alguno_de:
            raise ValueError("Un sello no puede depender de sí mismo.")
        return self


class ReglaDatos(BaseModel):
    model_config = ConfigDict(extra="forbid")

    operador: OperadorRegla
    hechos: list[Hecho] = Field(default_factory=list)
    resultado: ResultadoAplicabilidad
    mensaje: str = Field(min_length=1, max_length=300)

    @field_validator("mensaje", mode="before")
    @classmethod
    def limpiar(cls, valor: object) -> object:
        return _texto(valor)

    @model_validator(mode="after")
    def validar_hechos(self) -> "ReglaDatos":
        if self.operador == OperadorRegla.SIEMPRE:
            self.hechos = []
        elif not self.hechos:
            raise ValueError("La regla necesita al menos un dato a evaluar.")
        self.hechos = list(dict.fromkeys(self.hechos))
        return self


class AdvertenciaDatos(BaseModel):
    model_config = ConfigDict(extra="forbid")

    hecho: Hecho
    texto: str = Field(min_length=1, max_length=150)

    @field_validator("texto", mode="before")
    @classmethod
    def limpiar(cls, valor: object) -> object:
        return _texto(valor)


class ConjuntoDatos(BaseModel):
    model_config = ConfigDict(extra="forbid")

    nombre: str = Field(min_length=1, max_length=150)
    norma_origen: str = Field(min_length=1, max_length=500)
    fecha_vigencia: Optional[date] = None
    motivo: str = Field(min_length=1, max_length=500)
    umbrales: list[UmbralDatos]
    reglas: list[ReglaDatos]
    advertencias: list[AdvertenciaDatos] = Field(default_factory=list)

    @field_validator("nombre", "norma_origen", "motivo", mode="before")
    @classmethod
    def limpiar(cls, valor: object) -> object:
        return _texto(valor)


class NuevaVersion(BaseModel):
    model_config = ConfigDict(extra="forbid")

    version_base_id: Optional[int] = Field(default=None, gt=0)
    motivo: str = Field(min_length=1, max_length=500)

    @field_validator("motivo", mode="before")
    @classmethod
    def limpiar(cls, valor: object) -> object:
        return _texto(valor)


class Umbral(UmbralDatos):
    model_config = ConfigDict(from_attributes=True)

    id: int
    orden: int


class Regla(ReglaDatos):
    model_config = ConfigDict(from_attributes=True)

    id: int
    orden: int


class Advertencia(AdvertenciaDatos):
    model_config = ConfigDict(from_attributes=True)

    id: int
    orden: int


class ConjuntoReferencia(BaseModel):
    id: int
    numero: int
    estado: EstadoConjunto
    nombre: str
    norma_origen: str
    fecha_vigencia: Optional[date] = None

    model_config = ConfigDict(from_attributes=True)


class ConjuntoResumen(ConjuntoReferencia):
    motivo: str
    creado_por: Optional[PersonaResumen] = None
    creado_en: datetime
    publicado_por: Optional[PersonaResumen] = None
    publicado_en: Optional[datetime] = None
    archivado_en: Optional[datetime] = None
    version_base_id: Optional[int] = None


class Conjunto(ConjuntoResumen):
    umbrales: list[Umbral]
    reglas: list[Regla]
    advertencias: list[Advertencia]


class EntradaPrueba(BaseModel):
    model_config = ConfigDict(extra="forbid")

    tipo: TipoProducto = TipoProducto.SOLIDO
    por_100: dict[Nutriente, Optional[float]] = Field(default_factory=dict)
    energia_porcion: Optional[float] = Field(default=None, ge=0, allow_inf_nan=False)
    hechos: list[Hecho] = Field(default_factory=list)

    @field_validator("por_100")
    @classmethod
    def validar_valores(cls, valores: dict) -> dict:
        for valor in valores.values():
            if valor is not None and (not math.isfinite(valor) or valor < 0):
                raise ValueError("Los valores deben ser números mayores o iguales a cero.")
        return valores


class Aplicabilidad(BaseModel):
    resultado: ResultadoAplicabilidad
    mensaje: str
    regla_orden: Optional[int] = None


class DetalleUmbral(BaseModel):
    orden: int
    sello: Sello
    leyenda: str
    nutriente: Nutriente
    formula: Formula
    evaluado: bool
    motivo: Optional[str] = None
    datos: dict[str, float]
    operacion: Optional[str] = None
    valor: Optional[float] = None
    limite: float
    unidad: str
    comparacion: Comparacion
    simbolo: str
    supera: bool

    model_config = ConfigDict(from_attributes=True)


class ResultadoPrueba(BaseModel):
    conjunto: ConjuntoReferencia
    aplicabilidad: Aplicabilidad
    sellos: list[Sello]
    leyendas: list[str]
    advertencias: list[str]
    detalle: list[DetalleUmbral]


class EstadoModulo(BaseModel):
    activo: bool


class CorreccionDatos(BaseModel):
    model_config = ConfigDict(extra="forbid")

    hecho: Hecho
    valor: Optional[bool] = None
    motivo: Optional[str] = Field(default=None, max_length=300)

    @field_validator("motivo", mode="before")
    @classmethod
    def limpiar_motivo(cls, valor: object) -> object:
        return _texto_opcional(valor)

    @field_validator("hecho")
    @classmethod
    def validar_hecho(cls, hecho: Hecho) -> Hecho:
        if hecho not in HECHOS_DE_RECETA:
            raise ValueError("Solo se corrigen los agregados, los edulcorantes y la cafeína.")
        return hecho


class AplicabilidadDatos(BaseModel):
    model_config = ConfigDict(extra="forbid")

    envasado_ausencia_cliente: bool
    tipo_producto: TipoProducto = TipoProducto.SOLIDO
    correcciones: list[CorreccionDatos] = Field(default_factory=list)


class InsumoCausa(BaseModel):
    id: int
    nombre: str
    tipo: str


class AgregadoProducto(BaseModel):
    hecho: Hecho
    etiqueta: str
    sugerido: bool
    causas: list[InsumoCausa]
    corregido: Optional[bool] = None
    valor: bool


class RecetaEvaluada(BaseModel):
    receta_id: int
    version_id: int
    numero: int


class Evaluacion(BaseModel):
    resultado: ResultadoAplicabilidad
    mensaje: str
    regla_orden: Optional[int] = None
    conjunto: ConjuntoReferencia
    version_receta: Optional[RecetaEvaluada] = None
    hechos: list[Hecho]
    evaluado_por: Optional[PersonaResumen] = None
    evaluado_en: datetime


class MovimientoCorreccion(BaseModel):
    id: int
    hecho: Hecho
    etiqueta: str
    valor_sugerido: bool
    valor_anterior: Optional[bool] = None
    valor_nuevo: Optional[bool] = None
    motivo: Optional[str] = None
    personal: PersonaResumen
    fecha_hora: datetime


class ProductoResumen(BaseModel):
    id: int
    nombre: str
    activo: bool

    model_config = ConfigDict(from_attributes=True)


class AplicabilidadProducto(BaseModel):
    producto: ProductoResumen
    receta: Optional[RecetaEvaluada] = None
    envasado_ausencia_cliente: Optional[bool] = None
    tipo_producto: TipoProducto
    agregados: list[AgregadoProducto]
    evaluacion: Optional[Evaluacion] = None
    avisos: list[str]
    historial: list[MovimientoCorreccion]


class CalculoSellos(BaseModel):
    id: int
    producto_id: int
    version_receta: RecetaEvaluada
    conjunto: ConjuntoReferencia
    tipo_producto: TipoProducto
    base: Optional[str] = None
    provisorio: bool
    faltantes: list[str]
    entrada: dict[str, Optional[float]]
    hechos: list[Hecho]
    sellos: list[Sello]
    leyendas: list[str]
    advertencias: list[str]
    detalle: list[DetalleUmbral]
    calculado_por: PersonaResumen
    calculado_en: datetime


class CalculoResumen(BaseModel):
    id: int
    conjunto_numero: int
    receta_numero: int
    sellos: list[Sello]
    provisorio: bool
    calculado_en: datetime


class SellosProducto(BaseModel):
    producto: ProductoResumen
    aplicabilidad: Optional[Aplicabilidad] = None
    puede_calcular: bool
    motivo_no_calcula: Optional[str] = None
    calculo: Optional[CalculoSellos] = None
    avisos: list[str]
    historial: list[CalculoResumen] = Field(default_factory=list)
