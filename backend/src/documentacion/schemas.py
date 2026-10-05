from datetime import date
from pydantic import BaseModel, ConfigDict, Field, field_validator
from src.documentacion.models import TipoDocumento
from src.documentacion import exceptions

# Los siguientes schemas contienen atributos sin muchas restricciones de tipo.
# Podemos crear atributos con ciertas reglas mediante el uso de un "Field" adecuado.
# https://docs.pydantic.dev/latest/concepts/fields/


class DocumentoBase(BaseModel):
    nombre: str = Field(min_length=1)
    tipo_documento: TipoDocumento

    @field_validator(
        "tipo_documento", mode="before"
    )  # <- Más info. sobre mode: https://pydantic.dev/docs/validation/dev/concepts/validators/#field-validators
    @classmethod
    def is_valid_tipo_documento(cls, v: object) -> object:
        if not isinstance(v, str):
            return v
        try:
            return TipoDocumento(v.lower())
        except ValueError as error:
            raise exceptions.TipoDocumentacionInvalido(
                [tipo.value for tipo in TipoDocumento]
            ) from error

    @field_validator("nombre")
    @classmethod
    def nombre_no_vacio(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("El nombre del documento es obligatorio.")
        return v.strip()


class DocumentoCreate(DocumentoBase):
    fecha_vencimiento: date
    personal_id: int


class DocumentoUpdate(DocumentoBase):
    fecha_vencimiento: date


class Documento(DocumentoBase):
    id: int
    fecha_vencimiento: date | None = None
    personal_id: int
    nombre_personal: str

    # La siguiente opción nos permite instanciar schemas pydantic pasando modelos SQLAlchemy por parámetros.
    # De otro modo solo podríamos usar diccionarios.
    # Más info. sobre ConfigDict -> https://pydantic.dev/docs/validation/dev/api/pydantic/config
    model_config = ConfigDict(from_attributes = True)


class DocumentoDelete(DocumentoBase):
    id: int
    fecha_vencimiento: date | None = None
    personal_id: int

    model_config = ConfigDict(from_attributes=True)
