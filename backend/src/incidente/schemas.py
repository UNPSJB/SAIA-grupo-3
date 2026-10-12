from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator

from src.checklist.schemas import PersonalResumen
from src.incidente.auditoria import AccionMovimientoIncidente
from src.incidente.constants import EstadoIncidente


class IncidenteCreate(BaseModel):
    descripcion: str = Field(min_length=1, max_length=1000)

    @field_validator("descripcion", mode="before")
    @classmethod
    def descripcion_no_vacia(cls, valor: str) -> str:
        if not isinstance(valor, str) or not valor.strip():
            raise ValueError("La descripción del incidente es obligatoria.")
        return valor.strip()


class IncidenteUpdate(BaseModel):
    descripcion: str = Field(min_length=1, max_length=1000)
    estado: Optional[EstadoIncidente] = None

    @field_validator("descripcion", mode="before")
    @classmethod
    def descripcion_no_vacia(cls, valor: str) -> str:
        if not isinstance(valor, str) or not valor.strip():
            raise ValueError("La descripción del incidente es obligatoria.")
        return valor.strip()


class Incidente(BaseModel):
    id: int
    descripcion: str
    fecha_hora: datetime
    estado: EstadoIncidente
    reportado_por_dni: str
    reportado_por: PersonalResumen
    imagen_path: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class MovimientoIncidente(BaseModel):
    id: int
    incidente_id: int
    accion: AccionMovimientoIncidente
    fecha_hora: datetime
    motivo: Optional[str] = None
    personal: PersonalResumen

    model_config = ConfigDict(from_attributes=True)