from datetime import date, datetime
import re
from typing import Optional
from uuid import UUID

from pydantic import (
    BaseModel,
    ConfigDict,
    EmailStr,
    Field,
    StrictBool,
    field_validator,
    model_validator,
)


class Entrada(BaseModel):
    model_config = ConfigDict(
        str_strip_whitespace=True,
        extra="forbid",
        allow_inf_nan=False,
    )


class ProveedorInput(Entrada):
    nombre: str = Field(min_length=1, max_length=150)
    cuit: str
    telefono: Optional[str] = Field(default=None, max_length=40)
    email: Optional[EmailStr] = None
    numero_habilitacion: Optional[str] = Field(
        default=None,
        max_length=100,
    )
    vencimiento_habilitacion: Optional[date] = None

    @field_validator("cuit")
    @classmethod
    def normalizar_cuit(cls, valor: str) -> str:
        if not re.fullmatch(r"[0-9\s-]+", valor):
            raise ValueError("El CUIT solo admite números, espacios y guiones.")

        valor = re.sub(r"[\s-]", "", valor)

        if len(valor) != 11:
            raise ValueError("El CUIT debe tener 11 dígitos.")

        return valor

    @field_validator(
        "telefono",
        "email",
        "numero_habilitacion",
        mode="before",
    )
    @classmethod
    def vacio_a_none(cls, valor):
        if isinstance(valor, str):
            return valor.strip() or None
        return valor

    @model_validator(mode="after")
    def validar_habilitacion(self):
        if (
            self.vencimiento_habilitacion is not None
            and not self.numero_habilitacion
        ):
            raise ValueError(
                "Indicá el número de la habilitación que vence."
            )
        return self


class EstadoProveedor(Entrada):
    activo: StrictBool


class ProveedorOut(ProveedorInput):
    id: int
    activo: bool
    habilitacion_estado: Optional[str] = None


class LoteInput(Entrada):
    insumo_id: int = Field(gt=0)
    proveedor_id: int = Field(gt=0)
    numero_lote: str = Field(min_length=1, max_length=100)
    cantidad: float = Field(gt=0)
    fecha_recepcion: date
    fecha_vencimiento: date
    clave_operacion: UUID

    @model_validator(mode="after")
    def validar_fechas(self):
        if self.fecha_recepcion > date.today():
            raise ValueError(
                "La recepción no puede tener una fecha futura."
            )

        if self.fecha_vencimiento < self.fecha_recepcion:
            raise ValueError(
                "El vencimiento no puede ser anterior a la recepción."
            )

        return self


class LoteOut(BaseModel):
    id: int
    insumo_id: int
    insumo_nombre: str
    unidad: str
    proveedor_id: int
    proveedor_nombre: str
    numero_lote: str
    cantidad: float
    cantidad_disponible: float
    fecha_recepcion: date
    fecha_vencimiento: date
    registrado_por_id: int
    fecha_registro: datetime
    activo: bool
    conciliacion: bool
    clave_operacion: str
    estado_vencimiento: str
    dias_restantes: int
    advertencias: list[str]


class StockOut(BaseModel):
    insumo_id: int
    stock_total: float
    stock_identificado: float
    stock_sin_lote: float
    stock_utilizable: float
    stock_vencido: float