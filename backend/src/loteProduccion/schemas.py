from datetime import date, datetime
import math
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from src.checklist.schemas import PersonalResumen
from src.unidadMedida.schemas import UnidadMedida
from src.producto.schemas import Producto
from src.loteProduccion.constants import ErrorCode, EstadoLote


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
    insumos: list["LoteInsumoCreate"] = Field(default_factory=list)
    version_receta_id: Optional[int] = Field(default=None, gt=0)
    factor_receta: Optional[float] = Field(default=None, gt=0, allow_inf_nan=False)

    @field_validator("observaciones", mode="before")
    @classmethod
    def validar_observaciones(cls, valor: object) -> Optional[str]:
        return _texto_opcional(valor)

    @model_validator(mode="after")
    def validar_receta(self):
        if (self.version_receta_id is None) != (self.factor_receta is None):
            raise ValueError(ErrorCode.FACTOR_RECETA_INCOMPLETO)
        return self


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
    insumos_asociados: list["LoteInsumoDetalle"] = Field(default_factory=list)
    version_receta: Optional["VersionRecetaResumen"] = None
    factor_receta: Optional[float] = None
    pasos_pendientes_al_cerrar: Optional[int] = None
    motivo_cierre_pendientes: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class VersionRecetaResumen(BaseModel):
    id: int
    receta_id: int
    numero: int

    model_config = ConfigDict(from_attributes=True)


class CierreLote(BaseModel):
    confirmar_pasos_pendientes: bool = False
    motivo: Optional[str] = Field(default=None, max_length=500)

    @field_validator("motivo", mode="before")
    @classmethod
    def validar_motivo(cls, valor: object) -> Optional[str]:
        return _texto_opcional(valor)


class ConsumoRecepcionCreate(BaseModel):
    lote_recepcion_id: int = Field(gt=0)
    cantidad: float = Field(gt=0, allow_inf_nan=False)


class LoteInsumoCreate(BaseModel):
    insumo_id: int = Field(gt=0)
    cantidad_usada: float = Field(gt=0, allow_inf_nan=False)
    lotes_recepcion: list[ConsumoRecepcionCreate] = Field(default_factory=list)

    @model_validator(mode="after")
    def validar_asignaciones(self):
        ids = [lote.lote_recepcion_id for lote in self.lotes_recepcion]
        if len(ids) != len(set(ids)):
            raise ValueError("No se puede repetir una recepción en el mismo insumo.")

        if self.lotes_recepcion and not math.isclose(
            sum(lote.cantidad for lote in self.lotes_recepcion),
            self.cantidad_usada,
            rel_tol=1e-9,
            abs_tol=1e-9,
        ):
            raise ValueError(
                "La suma asignada a las recepciones debe coincidir con la cantidad usada."
            )
        return self


class InsumoSeleccionable(BaseModel):
    id: int
    nombre: str
    unidadMedidaObj: UnidadMedida
    cantidad: float

    model_config = ConfigDict(from_attributes=True)


class LoteRecepcionDisponible(BaseModel):
    id: int
    numero_lote: str
    proveedor_nombre: str
    fecha_vencimiento: date
    cantidad_disponible: float
    es_vencimiento_proximo: bool


class InsumoResumen(BaseModel):
    id: int
    nombre: str
    unidadMedidaObj: UnidadMedida

    model_config = ConfigDict(from_attributes=True)


class LoteInsumoDetalle(BaseModel):
    insumo_id: int
    insumo: InsumoResumen
    cantidad_usada: float

    model_config = ConfigDict(from_attributes=True)


class LoteRecepcionTrazabilidad(BaseModel):
    lote_recepcion_id: int
    numero_lote: str
    proveedor_nombre: str
    fecha_recepcion: date
    fecha_vencimiento: date
    cantidad_utilizada: float


class InsumoTrazabilidad(BaseModel):
    insumo_id: int
    insumo_nombre: str
    unidad: str
    cantidad_usada: float
    lotes_recepcion: list[LoteRecepcionTrazabilidad]
    cantidad_stock_anterior: float
    cantidad_historica_sin_origen: float


class LoteProduccionTrazabilidad(BaseModel):
    lote_produccion_id: int
    codigo: str
    producto_nombre: str
    fecha_produccion: date
    insumos: list[InsumoTrazabilidad]


LoteProduccionCreate.model_rebuild()
LoteProduccion.model_rebuild()
