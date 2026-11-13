from typing import Optional
from pydantic import BaseModel, ConfigDict, field_validator, Field
from src.unidadMedida.models import UnidadMedida
from src.insumos import exceptions
from src.unidadMedida.schemas import UnidadMedida 
from src.insumos.constants import TipoInsumo
from src.aditivoReferencia.schemas import AditivoReferencia

def _texto_opcional(valor: object) -> Optional[str]:
    if valor is None:
        return None
    texto = str(valor).strip()
    return texto or None

class InsumoBase(BaseModel):
    model_config = ConfigDict(extra="forbid")

    nombre:str
    stock_minimo: Optional[float] = Field(default=None, ge=0.0, allow_inf_nan=False, description="El stock mínimo no puede ser negativo")
    unidad_medida_id: int 
    tipo: TipoInsumo = TipoInsumo.INGREDIENTE
    aditivo_referencia_id: Optional[int] = None
    densidad_g_ml: Optional[float] = Field(default=None, gt=0, allow_inf_nan=False)
    peso_unidad_g: Optional[float] = Field(default=None, gt=0, allow_inf_nan=False)
    denominacion_rotulo: Optional[str] = Field(default=None, max_length=150)

    @field_validator("denominacion_rotulo", mode="before")
    @classmethod
    def validar_denominacion(cls, valor: object) -> Optional[str]:
        return _texto_opcional(valor)

class InsumoCreate(InsumoBase):
    pass 

class InsumoUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    nombre: Optional[str] = None
    stock_minimo: Optional[float] = Field(default=None, ge=0.0, allow_inf_nan=False)
    unidad_medida_id: Optional[int] = None
    activo: Optional[bool] = None
    tipo: Optional[TipoInsumo] = None
    aditivo_referencia_id: Optional[int] = None
    densidad_g_ml: Optional[float] = Field(default=None, gt=0, allow_inf_nan=False)
    peso_unidad_g: Optional[float] = Field(default=None, gt=0, allow_inf_nan=False)
    denominacion_rotulo: Optional[str] = Field(default=None, max_length=150)

    @field_validator("denominacion_rotulo", mode="before")
    @classmethod
    def validar_denominacion(cls, valor: object) -> Optional[str]:
        return _texto_opcional(valor)

class Insumo(InsumoBase):
    id: int
    cantidad: float
    activo: bool
    stock_bajo: bool = False
    unidadMedidaObj: UnidadMedida
    aditivo_referencia: Optional[AditivoReferencia] = None
    model_config = ConfigDict(from_attributes=True)

class InsumoDelete(InsumoBase):
    id: int
    activo: bool
    model_config = ConfigDict(from_attributes=True)
