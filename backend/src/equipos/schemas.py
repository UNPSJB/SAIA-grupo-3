from pydantic import BaseModel, ConfigDict, field_validator
from src.equipos.models import TipoEquipo
from src.equipos import exceptions
from typing import Optional

# Los siguientes schemas contienen atributos sin muchas restricciones de tipo.
# Podemos crear atributos con ciertas reglas mediante el uso de un "Field" adecuado.
# https://docs.pydantic.dev/latest/concepts/fields/


class EquipoBase(BaseModel):
    nombre: str
    tipo: TipoEquipo  # solo permitiremos valores de este tipo.
    ubicacion: str

    @field_validator(
        "tipo", mode="before"
    )  # <- Más info. sobre mode: https://pydantic.dev/docs/validation/dev/concepts/validators/#field-validators
    @classmethod
    def is_valid_tipo_equipo(cls, v: str) -> str:
        if isinstance(v, str) and v.lower() not in TipoEquipo:
            raise exceptions.TipoEquipoInvalido(list(TipoEquipo))
        return v.lower()


class EquipoCreate(EquipoBase):
    pass


class EquipoUpdate(BaseModel):
    nombre: Optional[str] = None
    tipo: Optional[TipoEquipo] = None
    ubicacion: Optional[str] = None

    @field_validator("tipo", mode="before")
    @classmethod
    def is_valid_tipo_equipo(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and isinstance(v, str):
            if v.lower() not in TipoEquipo:
                raise exceptions.TipoEquipoInvalido(list(TipoEquipo))
            return v.lower()
        return v


class Equipo(EquipoBase):
    id: int

    # La siguiente opción nos permite instanciar schemas pydantic pasando modelos SQLAlchemy por parámetros.
    # De otro modo solo podríamos usar diccionarios.
    # Más info. sobre ConfigDict -> https://pydantic.dev/docs/validation/dev/api/pydantic/config
    model_config = ConfigDict(from_attributes = True)


class EquipoDelete(EquipoBase):
    id: int

    model_config = ConfigDict(from_attributes = True)