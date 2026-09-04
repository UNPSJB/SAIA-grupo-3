from pydantic import BaseModel, ConfigDict, EmailStr
from typing import List
from src.documentacion.schemas import Documento

# Los siguientes schemas contienen atributos sin muchas restricciones de tipo.
# Podemos crear atributos con ciertas reglas mediante el uso de un "Field" adecuado.
# https://docs.pydantic.dev/latest/concepts/fields/


class PersonalBase(BaseModel):
    nombre: str
    apellido: str
    email: EmailStr
    dni: int
    nroLegajo: int


class PersonalCreate(PersonalBase):
    pass


class PersonalUpdate(PersonalBase):
    pass


class Personal(PersonalBase):
    documentos: List[Documento]

    # from_atributes=True permite que Pydantic trabaje con modelos SQLAlchemy
    # más info.: https://docs.pydantic.dev/latest/api/config/#pydantic.config.ConfigDict.from_attributes
    model_config = ConfigDict(from_attributes= True)
