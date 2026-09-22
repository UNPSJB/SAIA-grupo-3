from pydantic import BaseModel, ConfigDict, Field
from typing import Optional

class TareaBase(BaseModel):
    descripcion: str = Field(..., max_length=250, description="Descripción de la tarea")

class TareaCreate(TareaBase):
    pass

class TareaUpdate(BaseModel):
    descripcion: Optional[str] = Field(None, max_length=250)

class Tarea(TareaBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

class TareaDelete(TareaBase):
    id: int
    model_config = ConfigDict(from_attributes=True)