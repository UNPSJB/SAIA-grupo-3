from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field, field_validator
from src.registroCalibracion.constants import ErrorCode


class RegistroCalibracionDatos(BaseModel):
    fecha_calibracion: date
    otorgado_por: str = Field(min_length=1, max_length=150, description="Institución o persona que otorgó el certificado")

    @field_validator("fecha_calibracion")
    @classmethod
    def fecha_no_futura(cls, valor: date) -> date:
        if valor > date.today():
            raise ValueError(ErrorCode.FECHA_CALIBRACION_FUTURA)
        return valor

    @field_validator("otorgado_por", mode="before")
    @classmethod
    def otorgado_por_no_vacio(cls, valor: str) -> str:
        if not isinstance(valor, str) or not valor.strip():
            raise ValueError(ErrorCode.OTORGADO_POR_REQUERIDO)
        return valor.strip()


class RegistroCalibracionCreate(RegistroCalibracionDatos):
    equipo_id: int = Field(gt=0)


class RegistroCalibracionUpdate(RegistroCalibracionDatos):
    pass


class RegistroCalibracion(BaseModel):
    id: int
    equipo_id: int
    fecha_calibracion: date
    otorgado_por: str
    certificado_path: str
    fecha_vencimiento_calculada: Optional[date] = None
    fecha_registro: datetime
    activo: bool

    model_config = ConfigDict(from_attributes=True)