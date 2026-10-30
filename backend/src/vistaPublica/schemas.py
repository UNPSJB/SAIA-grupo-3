from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class IndicadorPublico(BaseModel):

    codigo: str = Field(..., examples=["cumplimiento"])
    titulo: str = Field(default="Cumplimiento de buenas prácticas")
    porcentaje: Optional[float] = Field(default=None, examples=[92.5])
    valor: Optional[str] = Field(default=None, examples=["92.5 %"])
    descripcion: Optional[str] = None


class ConfiguracionVistaPublicaResponse(BaseModel):

    activa: bool
    token: Optional[str] = None
    enlace: Optional[str] = None
    fecha_actualizacion: datetime

    model_config = ConfigDict(from_attributes=True)


class VistaPublicaResponse(BaseModel):

    establecimiento: str = "SAIA"
    fecha_actualizacion: datetime
    indicadores: list[IndicadorPublico] = Field(default_factory=list)