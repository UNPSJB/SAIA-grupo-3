from pydantic import BaseModel, ConfigDict, EmailStr
from typing import List
from src import Mascota

# Los siguientes schemas contienen atributos sin muchas restricciones de tipo.
# Podemos crear atributos con ciertas reglas mediante el uso de un "Field" adecuado.
# https://docs.pydantic.dev/latest/concepts/fields/


class PersonalBase(BaseModel):
    nombre: str
    apellido: str
    email: EmailStr


class PersonalCreate(PersonalBase):
    pass


class PersonalUpdate(PersonalBase):
    pass


class Personal(PersonalBase):
    dni: int
    nroLegajo: int
    documentos: List[Documentacion]

    # from_atributes=True permite que Pydantic trabaje con modelos SQLAlchemy
    # más info.: https://docs.pydantic.dev/latest/api/config/#pydantic.config.ConfigDict.from_attributes
    model_config = ConfigDict(from_attributes= True)
