from pydantic import BaseModel, ConfigDict, field_validator
from src.unidadMedida.models import TipoUnidadMedida
from src.insumos import exceptions


#Insumos

class InsumoBase(BaseModel):
    nombre:str
    cantidad: float
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
