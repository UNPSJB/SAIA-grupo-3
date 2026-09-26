from datetime import date, datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict
from src.tarea.models import FrecuenciaTarea
from src.checklist.models import EstadoItem

# Resúmenes: solo los datos que el checklist necesita mostrar,
# en lugar de devolver el plan / la tarea / el personal completos.
class PersonalResumen(BaseModel):
    dni: int
    nombre: str
    apellido: str
    model_config = ConfigDict(from_attributes=True)

class PlanResumen(BaseModel):
    id: int
    nombre: str
    model_config = ConfigDict(from_attributes=True)

class TareaResumen(BaseModel):
    id: int
    nombre: str
    procedimiento: str
    model_config = ConfigDict(from_attributes=True)

class ItemChecklist(BaseModel):
    id: int
    plan: PlanResumen
    tarea: TareaResumen
    frecuencia: FrecuenciaTarea
    periodo_inicio: date
    periodo_fin: date
    estado: EstadoItem
    realizada_por: Optional[PersonalResumen] = None
    realizada_en: Optional[datetime] = None
    foto_path: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)

class Checklist(BaseModel):
    fecha: date
    responsable: PersonalResumen
    items: List[ItemChecklist]
    total: int
    realizadas: int
    pendientes: int
