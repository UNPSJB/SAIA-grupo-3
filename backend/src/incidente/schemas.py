from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator

from src.checklist.schemas import PersonalResumen


class IncidenteCreate(BaseModel):
    descripcion: str = Field(min_length=1, max_length=1000)
    reportado_por_dni: int

    @field_validator("descripcion", mode="before")
    @classmethod
    def descripcion_no_vacia(cls, valor: str) -> str:
        if not isinstance(valor, str) or not valor.strip():
            raise ValueError("La descripción del incidente es obligatoria.")
        return valor.strip()


class IncidenteUpdate(BaseModel):
    descripcion: str = Field(min_length=1, max_length=1000)

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
    reportado_por_dni: int
    reportado_por: PersonalResumen
    imagen_path: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)
