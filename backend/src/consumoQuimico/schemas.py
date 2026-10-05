from pydantic import BaseModel, ConfigDict, Field
from datetime import date
from typing import Optional

class ConsumoQuimicoBase(BaseModel):
    insumo_quimico_id: int
    cantidad_utilizada: float = Field(ge=0.0)
    fecha: date
    tarea_limpieza: str = Field(min_length=1, description="La tarea de limpieza es obligatoria")
    operario_id: Optional[int] = None

class ConsumoQuimicoCreate(ConsumoQuimicoBase):
    pass

class ConsumoQuimicoUpdate(BaseModel):
    insumo_quimico_id: Optional[int] = None
    cantidad_utilizada: Optional[float] = Field(None, ge=0.0)
    fecha: Optional[date] = None
    tarea_limpieza: Optional[str] = Field(None, min_length=1)
    operario_id: Optional[int] = None
    activo: Optional[bool] = None 

class InsumoQuimicoInfo(BaseModel):
    id: int
    nombre: str
    model_config = ConfigDict(from_attributes=True)

class OperarioInfo(BaseModel):
    id: int    # Antes decía dni: int
    nombre: str
    apellido: str
    dni: str
    
    model_config = ConfigDict(from_attributes=True)

class ConsumoQuimico(ConsumoQuimicoBase):
    id: int
    activo: bool 
    insumo: Optional[InsumoQuimicoInfo] = None
    operario: Optional[OperarioInfo] = None
    
    model_config = ConfigDict(from_attributes=True)

class ConsumoQuimicoDelete(ConsumoQuimicoBase):
    id: int
    activo: bool 
    model_config = ConfigDict(from_attributes=True)

class ConsumoAcumulado(BaseModel):
    insumo_id: int
    nombre_insumo: str
    cantidad_total: float
    unidad_medida: str
    
    model_config = ConfigDict(from_attributes=True)