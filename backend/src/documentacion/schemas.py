from pydantic import BaseModel, ConfigDict, field_validator
from src.documentacion.models import TipoDocumento
from src.documentacion import exceptions

# Los siguientes schemas contienen atributos sin muchas restricciones de tipo.
# Podemos crear atributos con ciertas reglas mediante el uso de un "Field" adecuado.
# https://docs.pydantic.dev/latest/concepts/fields/


class DocumentoBase(BaseModel):
    nombre: str
    tipo: TipoDocumento # solo permitiremos valores de este tipo.

    @field_validator(
        "tipo", mode="before"
    )  # <- Más info. sobre mode: https://pydantic.dev/docs/validation/dev/concepts/validators/#field-validators
    @classmethod
    def is_valid_tipo_documento(cls, v: str) -> str:
        if v.lower() not in TipoDocumento:
            raise exceptions.TipoDocumentacionInvalido(list(TipoDocumento))
        return v.lower()


class DocumentoCreate(DocumentoBase):
    personal_id: int


class DocumentoUpdate(DocumentoBase):
    pass


class Documento(DocumentoBase):
    id: int
    tipo: TipoDocumento
    personal_id: int
    nombre_personal: str

    # La siguiente opción nos permite instanciar schemas pydantic pasando modelos SQLAlchemy por parámetros.
    # De otro modo solo podríamos usar diccionarios.
    # Más info. sobre ConfigDict -> https://pydantic.dev/docs/validation/dev/api/pydantic/config
    model_config = ConfigDict(from_attributes = True)


class DocumentoDelete(DocumentoBase):
    id: int
    personal_id: int

    model_config = ConfigDict(from_attributes=True)
