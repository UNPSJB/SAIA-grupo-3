from datetime import date, datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field

from src.checklist.models import EstadoItem
from src.tarea.models import FrecuenciaTarea
from src.tarea.schemas import TareaInsumoQuimicoSchema


class PersonalResumen(BaseModel):
    id: int
    nombre: str
    apellido: str
    dni: str

    model_config = ConfigDict(from_attributes=True)


class PlanResumen(BaseModel):
    id: int
    nombre: str

    model_config = ConfigDict(from_attributes=True)


class TareaResumen(BaseModel):
    id: int
    nombre: str
    procedimiento: str

    # Incluye los químicos configurados para la tarea y sus unidades.
    insumos_quimicos: List[TareaInsumoQuimicoSchema] = Field(
        default_factory=list,
    )

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


class InsumoQuimicoConsumido(BaseModel):
    insumo_quimico_id: int
    cantidad_utilizada: float = Field(ge=0)


class ItemFinalizarRequest(BaseModel):
    consumos: List[InsumoQuimicoConsumido] = Field(default_factory=list)