from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator

from src.accionCorrectiva.constants import ErrorCode
from src.checklist.schemas import PersonalResumen


class AccionCorrectivaCreate(BaseModel):
    descripcion: str = Field(min_length=1, max_length=1000)

    @field_validator("descripcion", mode="before")
    @classmethod
    def descripcion_no_vacia(cls, valor: str) -> str:
        if not isinstance(valor, str) or not valor.strip():
            raise ValueError(ErrorCode.DESCRIPCION_REQUERIDA)
        return valor.strip()


class AccionCorrectivaUpdate(AccionCorrectivaCreate):
    # Solo se corrige la descripción: responsable y fecha son la evidencia del cierre.
    pass


class ReaperturaIncidente(BaseModel):
    motivo: str = Field(min_length=1, max_length=1000)

    @field_validator("motivo", mode="before")
    @classmethod
    def motivo_no_vacio(cls, valor: str) -> str:
        if not isinstance(valor, str) or not valor.strip():
            raise ValueError(ErrorCode.MOTIVO_REAPERTURA_REQUERIDO)
        return valor.strip()


class AccionCorrectiva(BaseModel):
    id: int
    incidente_id: int
    descripcion: str
    fecha_cierre: datetime
    vigente: bool
    responsable: PersonalResumen

    model_config = ConfigDict(from_attributes=True)
