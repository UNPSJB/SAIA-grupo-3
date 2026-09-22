from pydantic import BaseModel, ConfigDict, field_validator, Field
from src.unidadMedida.models import TipoUnidadMedida
from src.insumos import exceptions
from src.unidadMedida.schemas import UnidadMedida 


#Insumos

class InsumoBase(BaseModel):
    nombre:str
    cantidad: float = Field(ge=0.0, description="La cantidad no puede ser negativa")
    unidad_medida_id: int 

class InsumoCreate(InsumoBase):
    pass 

class InsumoUpdate(InsumoBase):
    pass

class Insumo(InsumoBase):
    id:int
    unidadMedidaObj: UnidadMedida

    model_config = ConfigDict(from_attributes=True)

class InsumoDelete(InsumoBase):
    id: int
    unidad_medida_id: int
