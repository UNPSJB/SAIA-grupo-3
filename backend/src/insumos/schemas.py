from typing import Optional
from pydantic import BaseModel, ConfigDict, field_validator, Field
from src.unidadMedida.models import UnidadMedida
from src.insumos import exceptions
from src.unidadMedida.schemas import UnidadMedida 

class InsumoBase(BaseModel):
    nombre:str
    cantidad: float = Field(ge=0.0, description="La cantidad no puede ser negativa")
    unidad_medida_id: int 

class InsumoCreate(InsumoBase):
    pass 

class InsumoUpdate(BaseModel):
    nombre: Optional[str] = None
    cantidad: Optional[float] = Field(default=None, ge=0.0)
    unidad_medida_id: Optional[int] = None
    activo: Optional[bool] = None

class Insumo(InsumoBase):
    id: int
    activo: bool
    unidadMedidaObj: UnidadMedida
    model_config = ConfigDict(from_attributes=True)

class InsumoDelete(InsumoBase):
    id: int
    activo: bool
    unidad_medida_id: int
    model_config = ConfigDict(from_attributes=True)
