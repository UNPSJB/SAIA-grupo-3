from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict
from src.tareaRealizada.schemas import TareaRealizadaCreate, TareaRealizada

class PlanRealizadoBase(BaseModel):
    plan_origen_id: Optional[int] = None
    nombre: str
    descripcion: str
    responsable_id: int
    sector_id: Optional[int] = None
    equipo_id: Optional[int] = None

class PlanRealizadoCreate(PlanRealizadoBase):

    tareas_realizadas: List[TareaRealizadaCreate]

class PlanRealizado(PlanRealizadoBase):
    id: int
    fecha_ejecucion: datetime
    tareas_realizadas: List[TareaRealizada] = []

    model_config = ConfigDict(from_attributes=True)