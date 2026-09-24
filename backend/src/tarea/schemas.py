from pydantic import BaseModel, ConfigDict, Field
from typing import Optional, List
from src.tarea.models import FrecuenciaTarea
from src.equipos.schemas import Equipo
from src.elementos.schemas import Elemento
from src.insumos.schemas import Insumo

class TareaBase(BaseModel):
    nombre: str = Field(..., max_length=150, description="Nombre de la tarea")
    frecuencia: FrecuenciaTarea
    procedimiento: str = Field(..., max_length=2000, description="Texto para el procedimiento")
    equipo_id: Optional[int] = None

class TareaCreate(TareaBase):
    elemento_ids: List[int] = Field(default_factory=list, description="IDs de los elementos de limpieza")
    insumo_ids: List[int] = Field(default_factory=list, description="IDs de los insumos a utilizar")

class TareaUpdate(BaseModel):
    nombre: Optional[str] = Field(None, max_length=150)
    frecuencia: Optional[FrecuenciaTarea] = None
    procedimiento: Optional[str] = Field(None, max_length=2000)
    equipo_id: Optional[int] = None
    elemento_ids: Optional[List[int]] = None
    insumo_ids: Optional[List[int]] = None

class Tarea(TareaBase):
    id: int
    equipo: Optional[Equipo] = None
    elementos: List[Elemento] = []
    insumos: List[Insumo] = []
    
    model_config = ConfigDict(from_attributes=True)

class TareaDelete(TareaBase):
    id: int
    model_config = ConfigDict(from_attributes=True)