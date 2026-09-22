from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from src.equipos.schemas import Equipo 

class SectorBase(BaseModel):
    nombre: str
    activo: bool = True

class SectorCreate(BaseModel):
    nombre: str

class SectorUpdate(BaseModel):
    nombre: Optional[str] = None
    activo: Optional[bool] = None

class Sector(SectorBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

class SectorConEquipos(Sector):
    equipos: List[Equipo] = []
    
    model_config = ConfigDict(from_attributes=True)

class SectorDelete(SectorBase):
    id: int
    model_config = ConfigDict(from_attributes=True)