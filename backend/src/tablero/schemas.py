from datetime import date
from pydantic import BaseModel
from src.tablero.constants import Agrupacion

class PuntoCumplimiento(BaseModel):
    inicio: date
    fin: date
    total: int
    realizadas: int
    porcentaje: float | None

class CumplimientoChecklist(BaseModel):
    agrupacion: Agrupacion
    desde: date
    hasta: date
    primera_fecha: date | None
    total: int
    realizadas: int
    porcentaje: float | None
    puntos: list[PuntoCumplimiento]
