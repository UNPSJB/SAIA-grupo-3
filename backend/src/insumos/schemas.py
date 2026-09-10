from pydantic import BaseModel, ConfigDict, field_validator
from src.insumos.models import TipoUnidadMedida
from src.insumos import exceptions


#Unidad de medida
class UnidadMedidaBase(BaseModel):
    tipo: TipoUnidadMedida
    sufijo: str 

    @field_validator("tipo", mode="before")
    @classmethod
    def is_valid_tipo_unidad(cls, v: str) -> str:
        if v.lower() not in TipoUnidadMedida:
            raise exceptions.TipoUnidadInvalido(list(TipoUnidadMedida))
        return v.lower()

class UnidadMedidaCreate(UnidadMedidaBase):
    pass

class UnidadMedida(UnidadMedidaBase):
    id:int

    model_config = ConfigDict(from_attributes=True)

class UnidadMedidaDelete(UnidadMedidaBase):
    id: int

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
