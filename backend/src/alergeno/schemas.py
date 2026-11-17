from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator


def _texto(valor: object) -> object:
    return valor.strip() if isinstance(valor, str) else valor


class AlergenoCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    nombre: str = Field(min_length=1, max_length=60)
    grupo: str = Field(min_length=1, max_length=120)
    texto_declaracion: str = Field(min_length=1, max_length=100)
    implica_gluten: bool = False
    descripcion: Optional[str] = Field(default=None, max_length=300)
    orden: int = Field(default=0, ge=0, le=999)

    @field_validator("nombre", "grupo", "texto_declaracion", "descripcion", mode="before")
    @classmethod
    def limpiar(cls, valor: object) -> object:
        return _texto(valor)


class AlergenoUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    nombre: Optional[str] = Field(default=None, min_length=1, max_length=60)
    grupo: Optional[str] = Field(default=None, min_length=1, max_length=120)
    texto_declaracion: Optional[str] = Field(default=None, min_length=1, max_length=100)
    implica_gluten: Optional[bool] = None
    descripcion: Optional[str] = Field(default=None, max_length=300)
    orden: Optional[int] = Field(default=None, ge=0, le=999)
    activo: Optional[bool] = None

    @field_validator("nombre", "grupo", "texto_declaracion", "descripcion", mode="before")
    @classmethod
    def limpiar(cls, valor: object) -> object:
        return _texto(valor)


class Alergeno(BaseModel):
    id: int
    nombre: str
    grupo: str
    texto_declaracion: str
    implica_gluten: bool
    descripcion: Optional[str] = None
    orden: int
    activo: bool

    model_config = ConfigDict(from_attributes=True)


class AlergenoResumen(BaseModel):
    id: int
    nombre: str
    implica_gluten: bool

    model_config = ConfigDict(from_attributes=True)
