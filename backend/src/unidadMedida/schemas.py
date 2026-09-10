from pydantic import BaseModel, ConfigDict, field_validator
from src.unidadMedida.models import TipoUnidadMedida
from src.unidadMedida import exceptions


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
