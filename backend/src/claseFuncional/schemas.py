from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator

from src.claseFuncional.constants import ErrorCode


def _nombre_obligatorio(valor: object) -> str:
    if not isinstance(valor, str) or not valor.strip():
        raise ValueError(ErrorCode.NOMBRE_VACIO)
    return valor.strip()


class ClaseFuncionalBase(BaseModel):
    model_config = ConfigDict(extra="forbid")

    nombre: str = Field(max_length=100)
    ins_opcional: bool = False
    declarar_solo_funcion: bool = False

    @field_validator("nombre", mode="before")
    @classmethod
    def validar_nombre(cls, valor: object) -> str:
        return _nombre_obligatorio(valor)


class ClaseFuncionalCreate(ClaseFuncionalBase):
    pass


class ClaseFuncionalUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    nombre: Optional[str] = Field(default=None, max_length=100)
    ins_opcional: Optional[bool] = None
    declarar_solo_funcion: Optional[bool] = None
    activo: Optional[bool] = None

    @field_validator("nombre", mode="before")
    @classmethod
    def validar_nombre(cls, valor: object) -> str:
        return _nombre_obligatorio(valor)


class ClaseFuncional(BaseModel):
    id: int
    nombre: str
    ins_opcional: bool
    declarar_solo_funcion: bool
    activo: bool

    model_config = ConfigDict(from_attributes=True)
