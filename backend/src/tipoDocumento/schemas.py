from typing import Optional
from pydantic import BaseModel, ConfigDict, Field, field_validator


class TipoDocumentoBase(BaseModel):
    nombre: str = Field(min_length=1, max_length=100)

    @field_validator("nombre", mode="before")
    @classmethod
    def nombre_no_vacio(cls, valor: str) -> str:
        if not isinstance(valor, str) or not valor.strip():
            raise ValueError("El nombre del tipo de documento es obligatorio.")
        return valor.strip()


class TipoDocumentoCreate(TipoDocumentoBase):
    pass


class TipoDocumentoUpdate(BaseModel):
    nombre: Optional[str] = Field(default=None, min_length=1, max_length=100)
    activo: Optional[bool] = None

    @field_validator("nombre", mode="before")
    @classmethod
    def nombre_no_vacio(cls, valor: Optional[str]) -> Optional[str]:
        if valor is None:
            raise ValueError("El nombre del tipo de documento es obligatorio.")
        if valor is not None and not valor.strip():
            raise ValueError("El nombre del tipo de documento es obligatorio.")
        return valor.strip()


class TipoDocumento(TipoDocumentoBase):
    id: int
    activo: bool

    model_config = ConfigDict(from_attributes=True)


class TipoDocumentoDelete(TipoDocumento):
    pass
