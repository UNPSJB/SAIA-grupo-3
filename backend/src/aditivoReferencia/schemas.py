import re
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator

from src.aditivoReferencia.constants import PATRON_INS, ErrorCode
from src.claseFuncional.schemas import ClaseFuncional


def _nombre_obligatorio(valor: object) -> str:
    if not isinstance(valor, str) or not valor.strip():
        raise ValueError(ErrorCode.NOMBRE_VACIO)
    return valor.strip()


def _normalizar_ins(valor: object) -> Optional[str]:
    if valor is None:
        return None
    texto = re.sub(r"\s+", "", str(valor)).lower()
    if not texto:
        return None
    if not re.fullmatch(PATRON_INS, texto):
        raise ValueError(ErrorCode.INS_INVALIDO)
    return texto


class AditivoReferenciaBase(BaseModel):
    model_config = ConfigDict(extra="forbid")

    clase_funcional_id: int = Field(gt=0)
    nombre: str = Field(max_length=150)
    ins: Optional[str] = Field(default=None, max_length=15)

    @field_validator("nombre", mode="before")
    @classmethod
    def validar_nombre(cls, valor: object) -> str:
        return _nombre_obligatorio(valor)

    @field_validator("ins", mode="before")
    @classmethod
    def validar_ins(cls, valor: object) -> Optional[str]:
        return _normalizar_ins(valor)


class AditivoReferenciaCreate(AditivoReferenciaBase):
    pass


class AditivoReferenciaUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    clase_funcional_id: Optional[int] = Field(default=None, gt=0)
    nombre: Optional[str] = Field(default=None, max_length=150)
    ins: Optional[str] = Field(default=None, max_length=15)
    activo: Optional[bool] = None

    @field_validator("nombre", mode="before")
    @classmethod
    def validar_nombre(cls, valor: object) -> str:
        return _nombre_obligatorio(valor)

    @field_validator("ins", mode="before")
    @classmethod
    def validar_ins(cls, valor: object) -> Optional[str]:
        return _normalizar_ins(valor)


class AditivoReferencia(BaseModel):
    id: int
    clase_funcional_id: int
    nombre: str
    ins: Optional[str] = None
    activo: bool
    clase_funcional: ClaseFuncional

    model_config = ConfigDict(from_attributes=True)
