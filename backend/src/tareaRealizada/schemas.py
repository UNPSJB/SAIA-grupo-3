from datetime import datetime
from typing import Optional, Any
from pydantic import BaseModel, ConfigDict
from src.tarea.models import FrecuenciaTarea

class TareaRealizadaBase(BaseModel):
    tarea_origen_id: Optional[int] = None
    nombre: str
    frecuencia: FrecuenciaTarea
    procedimiento: str
    equipo_id: Optional[int] = None
    elementos_utilizados: Optional[list[dict[str, Any]]] = None
    insumos_utilizados: Optional[list[dict[str, Any]]] = None

class TareaRealizadaCreate(TareaRealizadaBase):
    pass  

class TareaRealizada(TareaRealizadaBase):
    id: int
    plan_realizado_id: int
    fecha_registro: datetime
    foto_path: Optional[str] = None 

    model_config = ConfigDict(from_attributes=True)