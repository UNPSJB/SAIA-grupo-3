from typing import Optional
from pydantic import BaseModel, ConfigDict, Field, field_validator
from src.insumosQuimicos.models import TipoQuimico
from src.insumosQuimicos import exceptions
from src.unidadMedida.schemas import UnidadMedida


class InsumoQuimicoBase(BaseModel):
    nombre: str
    cantidad: float = Field(ge=0.0, description="La cantidad no puede ser negativa")
    tipo_quimico: TipoQuimico
    unidad_medida_id: int

    @field_validator("tipo_quimico", mode="before")
    @classmethod
    def is_valid_tipo_quimico(cls, v: str) -> str:
        if isinstance(v, str) and v.lower() not in TipoQuimico:
            raise exceptions.TipoQuimicoInvalido(list(TipoQuimico))
        return v.lower() if isinstance(v, str) else v


class InsumoQuimicoCreate(InsumoQuimicoBase):
    pass


class InsumoQuimicoUpdate(BaseModel):
    nombre: Optional[str] = None
    cantidad: Optional[float] = Field(default=None, ge=0.0)
    tipo_quimico: Optional[TipoQuimico] = None
    unidad_medida_id: Optional[int] = None
    activo: Optional[bool] = None

    @field_validator("tipo_quimico", mode="before")
    @classmethod
    def is_valid_tipo_quimico(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and isinstance(v, str):
            if v.lower() not in TipoQuimico:
                raise exceptions.TipoQuimicoInvalido(list(TipoQuimico))
            return v.lower()
        return v


class InsumoQuimico(InsumoQuimicoBase):
    id: int
    activo: bool
    unidadMedidaObj: Optional[UnidadMedida] = None

    model_config = ConfigDict(from_attributes=True)


class InsumoQuimicoDelete(InsumoQuimicoBase):
    id: int
    activo: bool

    model_config = ConfigDict(from_attributes=True)