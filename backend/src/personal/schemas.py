from pydantic import BaseModel, ConfigDict, EmailStr, field_validator
from typing import List
from src.documentacion.schemas import Documento
from src.personal.models import TipoCapacidad
from src.personal import exceptions

# Los siguientes schemas contienen atributos sin muchas restricciones de tipo.
# Podemos crear atributos con ciertas reglas mediante el uso de un "Field" adecuado.
# https://docs.pydantic.dev/latest/concepts/fields/


class PersonalBase(BaseModel):
    nombre: str
    apellido: str
    email: EmailStr
    dni: int
    nroLegajo: int
    tipo_capacidad: TipoCapacidad  # solo permitiremos valores de este tipo.

    @field_validator(
        "tipo_capacidad", mode="before"
    )  # <- Más info. sobre mode: https://pydantic.dev/docs/validation/dev/concepts/validators/#field-validators
    @classmethod
    def is_valid_tipo_capacidad(cls, v: str) -> str:
        if v.lower() not in TipoCapacidad:
            raise exceptions.TipoCapacidadInvalido(list(TipoCapacidad))
        return v.lower()


class PersonalCreate(PersonalBase):
    pass


class PersonalUpdate(PersonalBase):
    pass


class Personal(PersonalBase):
    documentos: List[Documento]

    # from_atributes=True permite que Pydantic trabaje con modelos SQLAlchemy
    # más info.: https://docs.pydantic.dev/latest/api/config/#pydantic.config.ConfigDict.from_attributes
    model_config = ConfigDict(from_attributes= True)
