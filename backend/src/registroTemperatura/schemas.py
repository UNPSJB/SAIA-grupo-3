from pydantic import BaseModel, ConfigDict, Field
from typing import Optional
from datetime import datetime
from src.equipos.schemas import Equipo
from src.checklist.schemas import PersonalResumen

class RegistroTemperaturaCreate(BaseModel):
    equipo_id: int
    temperatura_registrada: float = Field(allow_inf_nan=False)
    accion_tomada: Optional[str] = Field(default=None, max_length=500)

    model_config = ConfigDict(str_strip_whitespace=True)

class RegistroTemperatura(BaseModel):
    id: int
    equipo_id: int
    operario_id: int
    temperatura_registrada: float
    fecha_hora_registro: datetime
    fuera_de_rango: bool
    accion_tomada: Optional[str] = None

    equipo: Equipo
    operario: PersonalResumen

    model_config = ConfigDict(from_attributes=True)
