from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator

from src.producto.constants import ErrorCode
from src.unidadMedida.schemas import UnidadMedida


def _nombre_obligatorio(valor: object) -> str:
    if not isinstance(valor, str) or not valor.strip():
        raise ValueError(ErrorCode.NOMBRE_VACIO)
    return valor.strip()


def _descripcion_opcional(valor: object) -> Optional[str]:
    if valor is None:
        return None
    texto = str(valor).strip()
    return texto or None


class ProductoBase(BaseModel):
    nombre: str = Field(max_length=100)
    descripcion: Optional[str] = Field(default=None, max_length=250)
    unidad_medida_id: int = Field(gt=0)

    @field_validator("nombre", mode="before")
    @classmethod
    def validar_nombre(cls, valor: object) -> str:
        return _nombre_obligatorio(valor)

    @field_validator("descripcion", mode="before")
    @classmethod
    def validar_descripcion(cls, valor: object) -> Optional[str]:
        return _descripcion_opcional(valor)


class ProductoCreate(ProductoBase):
    pass


class ProductoUpdate(BaseModel):
    nombre: Optional[str] = Field(default=None, max_length=100)
    descripcion: Optional[str] = Field(default=None, max_length=250)
    unidad_medida_id: Optional[int] = Field(default=None, gt=0)
    activo: Optional[bool] = None

    @field_validator("nombre", mode="before")
    @classmethod
    def validar_nombre(cls, valor: object) -> str:
        return _nombre_obligatorio(valor)

    @field_validator("descripcion", mode="before")
    @classmethod
    def validar_descripcion(cls, valor: object) -> Optional[str]:
        return _descripcion_opcional(valor)


class Producto(ProductoBase):
    id: int
    activo: bool
    unidad_medida: UnidadMedida

    model_config = ConfigDict(from_attributes=True)
