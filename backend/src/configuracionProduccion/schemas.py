from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict

from src.configuracionProduccion.constants import FormatoAditivos


class ConfiguracionUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    formato_aditivos: FormatoAditivos


class PersonaResumen(BaseModel):
    id: int
    nombre: str
    apellido: str

    model_config = ConfigDict(from_attributes=True)


class Configuracion(BaseModel):
    formato_aditivos: FormatoAditivos
    actualizado_por: Optional[PersonaResumen] = None
    actualizado_en: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
