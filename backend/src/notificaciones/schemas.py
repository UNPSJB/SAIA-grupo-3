from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict
from src.notificaciones.models import TipoNotificacion

class Notificacion(BaseModel):
    id: int
    tipo: TipoNotificacion
    titulo: str
    mensaje: str
    enlace: Optional[str] = None
    fecha_creacion: datetime
    leida: bool

    model_config = ConfigDict(from_attributes=True)

class Cantidad(BaseModel):
    cantidad: int
