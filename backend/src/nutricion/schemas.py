import math
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator

from src.insumos.constants import TipoInsumo
from src.nutricion.constants import AccionHistorial, ErrorCode, FuenteNutricional, Nutriente


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
