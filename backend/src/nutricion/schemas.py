import math
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator

from src.insumos.constants import TipoInsumo
from src.nutricion.constants import AccionHistorial, BaseCalculo, ErrorCode, FuenteNutricional, Nutriente


def _validar_valores(valores: dict) -> dict:
    for valor in valores.values():
        if valor is None:
            continue
        if not math.isfinite(valor):
            raise ValueError("Los valores nutricionales deben ser números.")
        if valor < 0:
            raise ValueError(ErrorCode.VALOR_NEGATIVO)
    return valores


def _texto_opcional(valor: object) -> Optional[str]:
    if valor is None:
        return None
    texto = str(valor).strip()
    return texto or None


class CargaManual(BaseModel):
    model_config = ConfigDict(extra="forbid")

    fuente: FuenteNutricional
    detalle_fuente: Optional[str] = Field(default=None, max_length=250)
    valores: dict[Nutriente, Optional[float]] = Field(min_length=1)

    @field_validator("valores")
    @classmethod
    def validar_valores(cls, valores: dict) -> dict:
        return _validar_valores(valores)

    @field_validator("detalle_fuente", mode="before")
    @classmethod
    def validar_detalle(cls, valor: object) -> Optional[str]:
        return _texto_opcional(valor)

    @field_validator("fuente")
    @classmethod
    def validar_fuente(cls, fuente: FuenteNutricional) -> FuenteNutricional:
        if fuente == FuenteNutricional.BASE_REFERENCIA:
            raise ValueError("Para usar la base de referencia, copiá los valores desde un alimento.")
        return fuente


class CopiaReferencia(BaseModel):
    model_config = ConfigDict(extra="forbid")

    alimento_referencia_id: int = Field(gt=0)


class ModificacionValores(BaseModel):
    model_config = ConfigDict(extra="forbid")

    valores: dict[Nutriente, float] = Field(min_length=1)

    @field_validator("valores")
    @classmethod
    def validar_valores(cls, valores: dict) -> dict:
        return _validar_valores(valores)


class PersonaResumen(BaseModel):
    id: int
    nombre: str
    apellido: str

    model_config = ConfigDict(from_attributes=True)


class AlimentoResumen(BaseModel):
    id: int
    fuente: str
    codigo: str
    nombre: str

    model_config = ConfigDict(from_attributes=True)


class AlimentoReferencia(AlimentoResumen):
    grupo: Optional[str] = None
    energia_kcal: Optional[float] = None
    carbohidratos_g: Optional[float] = None
    azucares_totales_g: Optional[float] = None
    azucares_anadidos_g: Optional[float] = None
    proteinas_g: Optional[float] = None
    grasas_totales_g: Optional[float] = None
    grasas_saturadas_g: Optional[float] = None
    grasas_trans_g: Optional[float] = None
    fibra_g: Optional[float] = None
    sodio_mg: Optional[float] = None


class ValorNutricional(BaseModel):
    nutriente: Nutriente
    etiqueta: str
    unidad: str
    valor: float
    fuente: FuenteNutricional
    detalle_fuente: Optional[str] = None
    alimento_referencia: Optional[AlimentoResumen] = None
    valor_fuente: float
    cargado_por: PersonaResumen
    cargado_en: datetime
    modificado: bool
    modificado_por: Optional[PersonaResumen] = None
    modificado_en: Optional[datetime] = None


class NutrienteDisponible(BaseModel):
    nutriente: Nutriente
    etiqueta: str
    unidad: str


class InsumoNutricional(BaseModel):
    id: int
    nombre: str
    tipo: TipoInsumo
    aporta_energia_sodio: bool

    model_config = ConfigDict(from_attributes=True)


class DatosNutricionales(BaseModel):
    insumo: InsumoNutricional
    requiere_datos: bool
    nutrientes: list[NutrienteDisponible]
    valores: list[ValorNutricional]
    energia_kj: Optional[float] = None
    faltantes: list[Nutriente]


class MovimientoHistorial(BaseModel):
    id: int
    nutriente: Nutriente
    etiqueta: str
    accion: AccionHistorial
    valor_anterior: Optional[float] = None
    valor_nuevo: Optional[float] = None
    fuente: Optional[FuenteNutricional] = None
    detalle_fuente: Optional[str] = None
    alimento_referencia: Optional[AlimentoResumen] = None
    personal: PersonaResumen
    fecha_hora: datetime


class ResultadoImportacion(BaseModel):
    fuente: str
    creados: int
    actualizados: int
    sin_cambios: int
    errores: list[str]


class ExpresionValor(BaseModel):
    calculado: float
    valor: float
    texto: str
    no_significativo: bool


class PorcentajeValorDiario(BaseModel):
    valor: float
    texto: str


class FilaNutricional(BaseModel):
    nutriente: Nutriente
    etiqueta: str
    unidad: str
    por_100: Optional[ExpresionValor] = None
    por_porcion: Optional[ExpresionValor] = None
    valor_diario: Optional[float] = None
    porcentaje_vd: Optional[PorcentajeValorDiario] = None


class EnergiaKilojoules(BaseModel):
    por_100: Optional[ExpresionValor] = None
    por_porcion: Optional[ExpresionValor] = None


class InformacionNutricional(BaseModel):
    version_id: int
    numero: int
    estado: str
    completa: bool
    calculada_en: datetime
    base: Optional[BaseCalculo] = None
    rendimiento_base: Optional[float] = None
    porcion_base: Optional[float] = None
    porcion_medida_casera: Optional[str] = None
    faltantes: list[str]
    filas: list[FilaNutricional]
    energia_kj: EnergiaKilojoules
    leyenda_vd: str
    expresion_no_significativo: str


class NutrienteConfiguracion(BaseModel):
    model_config = ConfigDict(extra="forbid")

    nutriente: Nutriente
    valor_diario: Optional[float] = Field(default=None, gt=0, allow_inf_nan=False)
    unidad: str = Field(min_length=1, max_length=10)
    decimales: int = Field(ge=0, le=3)
    entero_desde: Optional[float] = Field(default=None, ge=0, allow_inf_nan=False)
    umbral_no_significativo: Optional[float] = Field(default=None, ge=0, allow_inf_nan=False)

    @field_validator("unidad", mode="before")
    @classmethod
    def limpiar_unidad(cls, valor: object) -> object:
        return valor.strip() if isinstance(valor, str) else valor


class ConfiguracionNutricionalDatos(BaseModel):
    model_config = ConfigDict(extra="forbid")

    expresion_no_significativo: str = Field(min_length=1, max_length=40)
    decimales_vd: int = Field(ge=0, le=2)
    leyenda_vd: str = Field(min_length=1, max_length=250)
    nutrientes: list[NutrienteConfiguracion]

    @field_validator("expresion_no_significativo", "leyenda_vd", mode="before")
    @classmethod
    def limpiar_texto(cls, valor: object) -> object:
        return valor.strip() if isinstance(valor, str) else valor


class NutrienteConfigurado(NutrienteConfiguracion):
    etiqueta: str
    unidad_dato: str


class ConfiguracionNutricional(BaseModel):
    expresion_no_significativo: str
    decimales_vd: int
    leyenda_vd: str
    nutrientes: list[NutrienteConfigurado]
    modificado_por: Optional[PersonaResumen] = None
    modificado_en: Optional[datetime] = None
