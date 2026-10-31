from datetime import date
from typing import Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator, model_validator

from src.documentacion.constants import EstadoVencimiento
from src.perfil.constants import ErrorCode, MAXIMO_CARACTERES_PASSWORD, MINIMO_CARACTERES_PASSWORD
from src.tipoDocumento.schemas import TipoDocumento


class Perfil(BaseModel):
    id: int
    nombre: str
    apellido: str
    dni: str
    nroLegajo: str
    email: str
    username: str
    operar: bool
    administrar: bool

    model_config = ConfigDict(from_attributes=True)


class DocumentoPerfil(BaseModel):
    id: int
    tipo_documento: TipoDocumento
    fecha_vencimiento: Optional[date] = None
    estado: Optional[EstadoVencimiento] = None
    dias_restantes: Optional[int] = None


class CambioPassword(BaseModel):
    password_actual: str = Field(min_length=1, max_length=MAXIMO_CARACTERES_PASSWORD)
    password_nueva: str = Field(max_length=MAXIMO_CARACTERES_PASSWORD)
    confirmacion: str = Field(max_length=MAXIMO_CARACTERES_PASSWORD)

    @field_validator("password_nueva")
    @classmethod
    def validar_largo(cls, valor: str) -> str:
        if len(valor) < MINIMO_CARACTERES_PASSWORD:
            raise ValueError(ErrorCode.PASSWORD_CORTA)
        return valor

    @model_validator(mode="after")
    def validar_confirmacion(self) -> "CambioPassword":
        if self.password_nueva != self.confirmacion:
            raise ValueError(ErrorCode.PASSWORDS_NO_COINCIDEN)
        return self


class PerfilUpdate(BaseModel):
    email: EmailStr
