from pydantic import BaseModel, ConfigDict, Field
from typing import Optional, List
from src.tarea.models import FrecuenciaTarea
from src.equipos.schemas import Equipo
from src.elementos.schemas import Elemento
from src.insumosQuimicos.schemas import InsumoQuimico

class TareaInsumoQuimicoBase(BaseModel):
    insumo_quimico_id: int
    cantidad: float = Field(gt=0, description="Cantidad a utilizar (debe ser mayor a 0)")

class TareaInsumoQuimicoSchema(TareaInsumoQuimicoBase):
    insumo_quimico: Optional[InsumoQuimico] = None
    model_config = ConfigDict(from_attributes=True)

class TareaBase(BaseModel):
    nombre: str = Field(..., max_length=150, description="Nombre de la tarea")
    frecuencia: FrecuenciaTarea
    procedimiento: str = Field(..., max_length=2000, description="Texto para el procedimiento")
    equipo_id: Optional[int] = None

class TareaCreate(TareaBase):
    elemento_ids: List[int] = Field(default_factory=list, description="IDs de los elementos de limpieza")
    insumos_quimicos: List[TareaInsumoQuimicoBase] = Field(default_factory=list, description="Insumos químicos y cantidades")

class TareaUpdate(BaseModel):
    nombre: Optional[str] = Field(None, max_length=150)
    frecuencia: Optional[FrecuenciaTarea] = None
    procedimiento: Optional[str] = Field(None, max_length=2000)
    equipo_id: Optional[int] = None
    elemento_ids: Optional[List[int]] = None
    insumos_quimicos: Optional[List[TareaInsumoQuimicoBase]] = None

class Tarea(TareaBase):
    id: int
    equipo: Optional[Equipo] = None
    elementos: List[Elemento] = []
    insumos_quimicos: List[TareaInsumoQuimicoSchema] = []
    
    model_config = ConfigDict(from_attributes=True)

class TareaDelete(TareaBase):
    id: int
    model_config = ConfigDict(from_attributes=True)