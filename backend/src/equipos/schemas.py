from datetime import date
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator
from src.equipos.models import TipoEquipo
from src.equipos import exceptions

class SectorInfo(BaseModel):
    id: int
    nombre: str
    model_config = ConfigDict(from_attributes=True)

class EquipoBase(BaseModel):
    numero_serie: str
    nombre: str
    tipo: TipoEquipo
    sector_id: int

    fecha_ultima_calibracion: Optional[date] = None
    periodicidad_dias: Optional[int] = None

    controla_temperatura: bool = False
    temperatura_minima: Optional[float] = Field(default=None, allow_inf_nan=False)
    temperatura_maxima: Optional[float] = Field(default=None, allow_inf_nan=False)

    @field_validator("tipo", mode="before")
    @classmethod
    def is_valid_tipo_equipo(cls, v: str) -> str:
        if isinstance(v, str) and v.lower() not in TipoEquipo:
            raise exceptions.TipoEquipoInvalido(list(TipoEquipo))
        return v.lower() if isinstance(v, str) else v

class EquipoCreate(EquipoBase):
    @model_validator(mode="after")
    def validar_rango(self):
        if self.controla_temperatura:
            if self.temperatura_minima is None or self.temperatura_maxima is None:
                raise ValueError("Indicá la temperatura mínima y máxima para activar el control.")
            if self.temperatura_minima >= self.temperatura_maxima:
                raise ValueError("La temperatura mínima debe ser menor que la máxima.")
        return self


class EquipoUpdate(BaseModel):
    numero_serie: Optional[str] = None
    nombre: Optional[str] = None
    tipo: Optional[TipoEquipo] = None
    sector_id: Optional[int] = None
    activo: Optional[bool] = None

    fecha_ultima_calibracion: Optional[date] = None
    periodicidad_dias: Optional[int] = None

    controla_temperatura: Optional[bool] = None
    temperatura_minima: Optional[float] = Field(default=None, allow_inf_nan=False)
    temperatura_maxima: Optional[float] = Field(default=None, allow_inf_nan=False)

    @field_validator("tipo", mode="before")
    @classmethod
    def is_valid_tipo_equipo(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and isinstance(v, str):
            if v.lower() not in TipoEquipo:
                raise exceptions.TipoEquipoInvalido(list(TipoEquipo))
            return v.lower()
        return v

    @model_validator(mode="after")
    def validar_rangos_temperatura_update(self) -> "EquipoUpdate":
        if self.temperatura_minima is not None and self.temperatura_maxima is not None:
            if self.temperatura_minima >= self.temperatura_maxima:
                 raise ValueError("La temperatura mínima debe ser estrictamente menor que la máxima.")
        return self


class Equipo(EquipoBase):
    id: int
    activo: bool
    sector: SectorInfo | None = None

    model_config = ConfigDict(from_attributes=True)


class EquipoDelete(EquipoBase):
    id: int
    activo: bool

    model_config = ConfigDict(from_attributes=True)
