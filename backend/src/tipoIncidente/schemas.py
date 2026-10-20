from typing import Optional
from pydantic import BaseModel, ConfigDict, Field, field_validator


class TipoIncidenteBase(BaseModel):
    nombre: str = Field(min_length=1, max_length=100)
    color: str = Field(min_length=1, max_length=20)

    @field_validator("nombre", mode="before")
    @classmethod
    def nombre_no_vacio(cls, valor: str) -> str:
        if not isinstance(valor, str) or not valor.strip():
            raise ValueError("El nombre del tipo de incidente es obligatorio.")
        return valor.strip()

    @field_validator("color", mode="before")
    @classmethod
    def color_no_vacio(cls, valor: str) -> str:
        if not isinstance(valor, str) or not valor.strip():
            raise ValueError("El color del tipo de incidente es obligatorio.")
        return valor.strip()


class TipoIncidenteCreate(TipoIncidenteBase):
    pass


class TipoIncidenteUpdate(BaseModel):
    nombre: Optional[str] = Field(default=None, min_length=1, max_length=100)
    color: Optional[str] = Field(default=None, min_length=1, max_length=20)
    activo: Optional[bool] = None

    @field_validator("nombre", mode="before")
    @classmethod
    def nombre_no_vacio(cls, valor: Optional[str]) -> Optional[str]:
        if valor is None:
            raise ValueError("El nombre del tipo de incidente es obligatorio.")
        if valor is not None and not valor.strip():
            raise ValueError("El nombre del tipo de incidente es obligatorio.")
        return valor.strip()

    @field_validator("color", mode="before")
    @classmethod
    def color_no_vacio(cls, valor: Optional[str]) -> Optional[str]:
        if valor is None:
            raise ValueError("El color del tipo de incidente es obligatorio.")
        if valor is not None and not valor.strip():
            raise ValueError("El color del tipo de incidente es obligatorio.")
        return valor.strip()


class TipoIncidente(TipoIncidenteBase):
    id: int
    activo: bool

    model_config = ConfigDict(from_attributes=True)


class TipoIncidenteDelete(TipoIncidente):
    pass
