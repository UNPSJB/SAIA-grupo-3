from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field, StrictBool


CodigoIndicador = Literal[
    "cumplimiento",
    "tareas_realizadas",
    "dias_limpieza",
    "equipos_calibrados",
    "documentos_tecnicos",
    "productos_elaborados",
    "lotes_producidos",
]


class IndicadorPublico(BaseModel):
    codigo: CodigoIndicador
    titulo: str
    porcentaje: Optional[float] = Field(
        default=None,
        ge=0,
        le=100,
    )
    valor: Optional[str] = None
    descripcion: Optional[str] = None


class ConfiguracionVistaPublicaResponse(BaseModel):
    activa: bool
    token: Optional[str] = None
    enlace: Optional[str] = None
    fecha_actualizacion: datetime
    indicadores_habilitados: list[CodigoIndicador] = Field(
        default_factory=list,
    )

    model_config = ConfigDict(from_attributes=True)


class VistaPublicaResponse(BaseModel):
    establecimiento: str = "SAIA"
    fecha_actualizacion: datetime
    indicadores: list[IndicadorPublico] = Field(
        default_factory=list,
    )


class IndicadorActualizar(BaseModel):
    codigo: CodigoIndicador
    habilitado: StrictBool

    model_config = ConfigDict(extra="forbid")