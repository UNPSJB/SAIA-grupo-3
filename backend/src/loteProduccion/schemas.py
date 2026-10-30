from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator

from src.checklist.schemas import PersonalResumen
from src.producto.schemas import Producto
from src.loteProduccion.constants import EstadoLote


def _texto_opcional(valor: object) -> Optional[str]:
    if valor is None:
        return None
    texto = str(valor).strip()
    return texto or None


class LoteProduccionCreate(BaseModel):
    producto_id: int = Field(gt=0)
    fecha_produccion: date
    cantidad: float = Field(gt=0)
    observaciones: Optional[str] = Field(default=None, max_length=500)

    @field_validator("observaciones", mode="before")
    @classmethod
    def validar_observaciones(cls, valor: object) -> Optional[str]:
        return _texto_opcional(valor)


class LoteProduccionUpdate(BaseModel):
    producto_id: Optional[int] = Field(default=None, gt=0)
    fecha_produccion: Optional[date] = None
    cantidad: Optional[float] = Field(default=None, gt=0)
    observaciones: Optional[str] = Field(default=None, max_length=500)
    activo: Optional[bool] = None

    @field_validator("observaciones", mode="before")
    @classmethod
    def validar_observaciones(cls, valor: object) -> Optional[str]:
        return _texto_opcional(valor)


class LoteProduccion(BaseModel):
    id: int
    codigo: str
    producto_id: int
    producto: Producto
    fecha_produccion: date
    cantidad: float
    observaciones: Optional[str] = None
    registrado_por_id: int
    registrado_por: PersonalResumen
    fecha_registro: datetime
    activo: bool

    estado: EstadoLote
    fecha_cierre: Optional[datetime] = None
    cerrado_por_id: Optional[int] = None
    cerrado_por: Optional[PersonalResumen] = None

    model_config = ConfigDict(from_attributes=True)
