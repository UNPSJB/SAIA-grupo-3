from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from src.aditivoReferencia.schemas import AditivoReferencia
from src.insumos.constants import TipoInsumo
from src.receta.constants import MOTIVO_VERSION_INICIAL, EstadoVersionReceta, ErrorCode
from src.unidadMedida.schemas import UnidadMedida


def _texto_obligatorio(valor: object, mensaje: str) -> str:
    if not isinstance(valor, str) or not valor.strip():
        raise ValueError(mensaje)
    return valor.strip()


def _texto_opcional(valor: object) -> Optional[str]:
    if valor is None:
        return None
    texto = str(valor).strip()
    return texto or None


class RenglonCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    insumo_id: int = Field(gt=0)
    tipo: TipoInsumo
    cantidad: float = Field(gt=0, allow_inf_nan=False)
    unidad_medida_id: int = Field(gt=0)


class PasoCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    nombre: str = Field(max_length=150)
    procedimiento: str = Field(max_length=2000)
    equipo_id: Optional[int] = Field(default=None, gt=0)
    tiempo_minutos: Optional[int] = Field(default=None, gt=0, le=10080)
    temperatura_celsius: Optional[float] = Field(default=None, ge=-60, le=400, allow_inf_nan=False)
    punto_control: bool = False

    @field_validator("nombre", mode="before")
    @classmethod
    def validar_nombre(cls, valor: object) -> str:
        return _texto_obligatorio(valor, "Cada paso debe tener un nombre.")

    @field_validator("procedimiento", mode="before")
    @classmethod
    def validar_procedimiento(cls, valor: object) -> str:
        return _texto_obligatorio(valor, "Cada paso debe tener su procedimiento.")


class VersionDatos(BaseModel):
    model_config = ConfigDict(extra="forbid")

    rendimiento_cantidad: float = Field(gt=0, allow_inf_nan=False)
    rendimiento_unidad_id: int = Field(gt=0)
    porcion_cantidad: Optional[float] = Field(default=None, gt=0, allow_inf_nan=False)
    porcion_unidad_id: Optional[int] = Field(default=None, gt=0)
    porcion_medida_casera: Optional[str] = Field(default=None, max_length=100)
    renglones: list[RenglonCreate]
    pasos: list[PasoCreate] = Field(default_factory=list)

    @field_validator("porcion_medida_casera", mode="before")
    @classmethod
    def validar_medida_casera(cls, valor: object) -> Optional[str]:
        return _texto_opcional(valor)

    @model_validator(mode="after")
    def validar_version(self) -> "VersionDatos":
        if not any(renglon.tipo == TipoInsumo.INGREDIENTE for renglon in self.renglones):
            raise ValueError(ErrorCode.SIN_INGREDIENTES)
        if (self.porcion_cantidad is None) != (self.porcion_unidad_id is None):
            raise ValueError(ErrorCode.PORCION_INCOMPLETA)
        return self


class RecetaCreate(VersionDatos):
    producto_id: int = Field(gt=0)
    motivo: str = Field(default=MOTIVO_VERSION_INICIAL, max_length=500)

    @field_validator("motivo", mode="before")
    @classmethod
    def validar_motivo(cls, valor: object) -> str:
        return _texto_opcional(valor) or MOTIVO_VERSION_INICIAL


class NuevaVersion(VersionDatos):
    version_base_id: int = Field(gt=0)
    motivo: str = Field(max_length=500)

    @field_validator("motivo", mode="before")
    @classmethod
    def validar_motivo(cls, valor: object) -> str:
        return _texto_obligatorio(valor, "Indicá el motivo del cambio.")


class InsumoResumen(BaseModel):
    id: int
    nombre: str
    activo: bool

    model_config = ConfigDict(from_attributes=True)


class InsumoDisponible(InsumoResumen):
    tipo: TipoInsumo
    unidad_medida_id: int
    unidadMedidaObj: UnidadMedida
    aditivo_referencia: Optional[AditivoReferencia] = None


class EquipoResumen(BaseModel):
    id: int
    nombre: str

    model_config = ConfigDict(from_attributes=True)


class PersonaResumen(BaseModel):
    id: int
    nombre: str
    apellido: str

    model_config = ConfigDict(from_attributes=True)


class ProductoResumen(BaseModel):
    id: int
    nombre: str
    activo: bool
    unidad_medida: UnidadMedida

    model_config = ConfigDict(from_attributes=True)


class Renglon(BaseModel):
    id: int
    orden: int
    tipo: TipoInsumo
    cantidad: float
    insumo: InsumoResumen
    unidad_medida: UnidadMedida
    aditivo_referencia: Optional[AditivoReferencia] = None

    model_config = ConfigDict(from_attributes=True)


class Paso(BaseModel):
    id: int
    orden: int
    nombre: str
    procedimiento: str
    equipo: Optional[EquipoResumen] = None
    tiempo_minutos: Optional[int] = None
    temperatura_celsius: Optional[float] = None
    punto_control: bool

    model_config = ConfigDict(from_attributes=True)


class VersionResumen(BaseModel):
    id: int
    numero: int
    estado: EstadoVersionReceta
    motivo: str
    fecha_creacion: datetime
    creado_por: PersonaResumen

    model_config = ConfigDict(from_attributes=True)


class Version(VersionResumen):
    receta_id: int
    rendimiento_cantidad: float
    rendimiento_unidad: UnidadMedida
    porcion_cantidad: Optional[float] = None
    porcion_unidad: Optional[UnidadMedida] = None
    porcion_medida_casera: Optional[str] = None
    renglones: list[Renglon]
    pasos: list[Paso]


class Receta(BaseModel):
    id: int
    fecha_creacion: datetime
    producto: ProductoResumen
    version_vigente: Version
    versiones: list[VersionResumen]

    model_config = ConfigDict(from_attributes=True)


class RenglonEscalado(BaseModel):
    insumo: InsumoResumen
    tipo: TipoInsumo
    aditivo_referencia: Optional[AditivoReferencia] = None
    unidad_medida: UnidadMedida
    cantidad_receta: float
    cantidad_escalada: float
    unidad_stock: UnidadMedida
    cantidad_en_unidad_stock: Optional[float] = None
    stock_disponible: float
    stock_suficiente: Optional[bool] = None


class Escalado(BaseModel):
    receta_id: int
    version_id: int
    version_numero: int
    producto: ProductoResumen
    factor: float
    rendimiento_receta: float
    rendimiento_escalado: float
    rendimiento_unidad: UnidadMedida
    cantidad_lote: Optional[float] = None
    renglones: list[RenglonEscalado]
    hay_faltantes: bool


class RecetaDeProducto(BaseModel):
    producto: ProductoResumen
    receta_id: Optional[int] = None
    version_vigente: Optional[VersionResumen] = None
