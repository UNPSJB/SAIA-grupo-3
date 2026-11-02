from typing import Optional
from pydantic import BaseModel, ConfigDict, field_validator, Field
from src.unidadMedida.models import UnidadMedida
from src.insumos import exceptions
from src.unidadMedida.schemas import UnidadMedida 

class InsumoBase(BaseModel):
    model_config = ConfigDict(extra="forbid")

    nombre:str
    stock_minimo: Optional[float] = Field(default=None, ge=0.0, allow_inf_nan=False, description="El stock mínimo no puede ser negativo")
    unidad_medida_id: int 

class InsumoCreate(InsumoBase):
    pass 

class InsumoUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    nombre: Optional[str] = None
    stock_minimo: Optional[float] = Field(default=None, ge=0.0, allow_inf_nan=False)
    unidad_medida_id: Optional[int] = None
    activo: Optional[bool] = None

class Insumo(InsumoBase):
    id: int
    cantidad: float
    activo: bool
    stock_bajo: bool = False
    unidadMedidaObj: UnidadMedida
    model_config = ConfigDict(from_attributes=True)

class InsumoDelete(InsumoBase):
    id: int
    activo: bool
    model_config = ConfigDict(from_attributes=True)
