from typing import Optional
from datetime import date
from pydantic import BaseModel, ConfigDict, Field, field_validator

class ElementoBase(BaseModel):
    nombre: str = Field(min_length=1, max_length=100)
    frecuencia_recambio: Optional[int] = Field(default=None, ge=1)

    @field_validator("nombre", mode="before")
    @classmethod
    def nombre_no_vacio(cls, v: str) -> str:
        if not isinstance(v, str) or not v.strip():
            raise ValueError("El nombre del elemento es obligatorio.")
        return v.strip()

class ElementoCreate(ElementoBase):
    pass

class ElementoUpdate(BaseModel):
    nombre: Optional[str] = None
    frecuencia_recambio: Optional[int] = Field(default=None, ge=1)
    activo: Optional[bool] = None

    @field_validator("nombre", mode="before")
    @classmethod
    def nombre_no_vacio(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and not v.strip():
            raise ValueError("El nombre del elemento es obligatorio.")
        return v.strip() if v is not None else v

class Elemento(ElementoBase):
    id: int
    activo: bool
    # Agregamos los nuevos campos al esquema de salida
    fecha_ultimo_recambio: Optional[date] = None
    fecha_proximo_recambio: Optional[date] = None

    model_config = ConfigDict(from_attributes=True)

class ElementoDelete(ElementoBase):
    id: int
    activo: bool

    model_config = ConfigDict(from_attributes=True)

class RegistroRecambioIn(BaseModel):
    fecha_recambio: date