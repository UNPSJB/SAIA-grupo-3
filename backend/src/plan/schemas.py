from pydantic import BaseModel, ConfigDict, Field, model_validator
from typing import List, Optional
from datetime import date
from src.tarea.schemas import Tarea

class PlanBase(BaseModel):
    nombre: str = Field(..., max_length=100)
    descripcion: str = Field(..., max_length=250)
    responsable_id: int
    sector_id: Optional[int] = None
    equipo_id: Optional[int] = None

    @model_validator(mode='after')
    def validar_destino_plan(self) -> 'PlanBase':
        if not self.sector_id and not self.equipo_id:
            raise ValueError('El plan debe estar asignado al menos a un sector o a un equipo.')
        return self

class PlanCreate(PlanBase):
    tarea_ids: List[int] = Field(min_length=1, description="IDs de las tareas asociadas")

class PlanUpdate(BaseModel):
    nombre: Optional[str] = Field(None, max_length=100)
    descripcion: Optional[str] = Field(None, max_length=250)
    responsable_id: Optional[int] = None
    sector_id: Optional[int] = None
    equipo_id: Optional[int] = None
    tarea_ids: Optional[List[int]] = None
    activo: Optional[bool] = None

class Plan(PlanBase):
    id: int
    activo: bool
    fecha_inicio: Optional[date] = None
    fecha_fin: Optional[date] = None
    tareas: List[Tarea] = []
    
    model_config = ConfigDict(from_attributes=True)
