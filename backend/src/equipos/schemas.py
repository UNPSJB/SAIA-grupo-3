from typing import Optional
from pydantic import BaseModel, ConfigDict, field_validator
from src.equipos.models import TipoEquipo
from src.equipos import exceptions

class EquipoBase(BaseModel):
    numero_serie: str
    nombre: str
    tipo: TipoEquipo
    sector_id: int  

    @field_validator("tipo", mode="before")
    @classmethod
    def is_valid_tipo_equipo(cls, v: str) -> str:
        if isinstance(v, str) and v.lower() not in TipoEquipo:
            raise exceptions.TipoEquipoInvalido(list(TipoEquipo))
        return v.lower() if isinstance(v, str) else v


class EquipoCreate(EquipoBase):
    pass


class EquipoUpdate(BaseModel):
    numero_serie: Optional[str] = None
    nombre: Optional[str] = None
    tipo: Optional[TipoEquipo] = None
    sector_id: Optional[int] = None
    activo: Optional[bool] = None

    @field_validator("tipo", mode="before")
    @classmethod
    def is_valid_tipo_equipo(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and isinstance(v, str):
            if v.lower() not in TipoEquipo:
                raise exceptions.TipoEquipoInvalido(list(TipoEquipo))
            return v.lower()
        return v


class Equipo(EquipoBase):
    id: int
    activo: bool

    model_config = ConfigDict(from_attributes=True)


class EquipoDelete(EquipoBase):
    id: int
    activo: bool

    model_config = ConfigDict(from_attributes=True)