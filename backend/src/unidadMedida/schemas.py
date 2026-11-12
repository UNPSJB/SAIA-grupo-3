from pydantic import BaseModel, ConfigDict, Field, field_validator
from src.unidadMedida.models import TipoUnidadMedida
from src.unidadMedida import exceptions
from typing import Optional

class UnidadMedidaBase(BaseModel):
    tipo: TipoUnidadMedida
    sufijo: str 
    factor_base: Optional[float] = Field(default=None, gt=0, allow_inf_nan=False)

    @field_validator("tipo", mode="before")
    @classmethod
    def is_valid_tipo_unidad(cls, v: str) -> str:
        if v.lower() not in TipoUnidadMedida:
            raise exceptions.TipoUnidadInvalido(list(TipoUnidadMedida))
        return v.lower()

class UnidadMedidaCreate(UnidadMedidaBase):
    pass

class UnidadMedidaUpdate(BaseModel):
    tipo: Optional[TipoUnidadMedida] = None
    sufijo: Optional[str] = None
    activo: Optional[bool] = None
    factor_base: Optional[float] = Field(default=None, gt=0, allow_inf_nan=False)

class UnidadMedida(UnidadMedidaBase):
    id: int
    activo: bool
    model_config = ConfigDict(from_attributes=True)

class UnidadMedidaDelete(UnidadMedidaBase):
    id: int
    activo: bool
    model_config = ConfigDict(from_attributes=True)
