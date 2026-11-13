import math
from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator

from src.produccionDelDia.constants import AccionPasoLote, ErrorCode, EstadoPasoLote


def _texto_opcional(valor: object) -> Optional[str]:
    if valor is None:
        return None
    texto = str(valor).strip()
    return texto or None


class RealizarPaso(BaseModel):
    valor_medido: Optional[float] = None
    observacion: Optional[str] = Field(default=None, max_length=500)

    @field_validator("valor_medido", mode="before")
    @classmethod
    def validar_valor(cls, valor: object) -> Optional[float]:
        texto = _texto_opcional(valor)
        if texto is None:
            return None
        try:
            numero = float(texto.replace(",", "."))
        except ValueError as error:
            raise ValueError(ErrorCode.VALOR_MEDIDO_INVALIDO) from error
        if not math.isfinite(numero):
            raise ValueError(ErrorCode.VALOR_MEDIDO_INVALIDO)
        return numero

    @field_validator("observacion", mode="before")
    @classmethod
    def validar_observacion(cls, valor: object) -> Optional[str]:
        return _texto_opcional(valor)


class AnularPaso(BaseModel):
    model_config = ConfigDict(extra="forbid")

    motivo: str = Field(max_length=250)

    @field_validator("motivo", mode="before")
    @classmethod
    def validar_motivo(cls, valor: object) -> str:
        texto = _texto_opcional(valor)
        if texto is None:
            raise ValueError(ErrorCode.MOTIVO_OBLIGATORIO)
        return texto


class PersonaResumen(BaseModel):
    id: int
    nombre: str
    apellido: str

    model_config = ConfigDict(from_attributes=True)


class EquipoResumen(BaseModel):
    id: int
    nombre: str

    model_config = ConfigDict(from_attributes=True)


class Movimiento(BaseModel):
    id: int
    accion: AccionPasoLote
    fecha_hora: datetime
    personal: PersonaResumen
    valor_medido: Optional[float] = None
    observacion: Optional[str] = None
    foto_path: Optional[str] = None
    motivo: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class PasoLote(BaseModel):
    id: int
    lote_id: int
    orden: int
    nombre: str
    procedimiento: str
    equipo: Optional[EquipoResumen] = None
    tiempo_minutos: Optional[int] = None
    temperatura_celsius: Optional[float] = None
    punto_control: bool
    estado: EstadoPasoLote
    realizado_por: Optional[PersonaResumen] = None
    realizado_en: Optional[datetime] = None
    valor_medido: Optional[float] = None
    observacion: Optional[str] = None
    foto_path: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class PasoConMovimientos(PasoLote):
    movimientos: list[Movimiento]


class ProductoResumen(BaseModel):
    id: int
    nombre: str

    model_config = ConfigDict(from_attributes=True)


class LoteDelDia(BaseModel):
    id: int
    codigo: str
    producto: ProductoResumen
    fecha_produccion: date
    cantidad: float
    unidad: str
    registrado_por: PersonaResumen
    version_numero: Optional[int] = None
    receta_id: Optional[int] = None
    realizados: int
    total: int
    pasos: list[PasoLote]
