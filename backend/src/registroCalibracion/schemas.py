from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field, field_validator
from src.documentacion.constants import EstadoVencimiento
from src.equipos.models import TipoEquipo
from src.registroCalibracion.constants import ErrorCode


class RegistroCalibracionDatos(BaseModel):
    """Campos que el usuario carga (y puede corregir) en un registro de calibración."""
    fecha_calibracion: date
    otorgado_por: str = Field(min_length=1, max_length=150, description="Institución o persona que otorgó el certificado")

    @field_validator("fecha_calibracion")
    @classmethod
    def fecha_no_futura(cls, valor: date) -> date:
        if valor > date.today():
            raise ValueError(ErrorCode.FECHA_CALIBRACION_FUTURA)
        return valor

    @field_validator("otorgado_por", mode="before")
    @classmethod
    def otorgado_por_no_vacio(cls, valor: str) -> str:
        if not isinstance(valor, str) or not valor.strip():
            raise ValueError(ErrorCode.OTORGADO_POR_REQUERIDO)
        return valor.strip()


class RegistroCalibracionCreate(RegistroCalibracionDatos):
    equipo_id: int = Field(gt=0)


class RegistroCalibracionUpdate(RegistroCalibracionDatos):
    # El equipo no se puede cambiar: si se cargó en el equipo equivocado, se elimina y se registra de nuevo.
    pass


class RegistroCalibracion(BaseModel):
    id: int
    equipo_id: int
    fecha_calibracion: date
    otorgado_por: str
    certificado_path: str
    fecha_vencimiento_calculada: Optional[date] = None
    fecha_registro: datetime
    activo: bool

    model_config = ConfigDict(from_attributes=True)


# ---------- Listado de vencimientos de calibración ----------

class EquipoResumen(BaseModel):
    """Solo los datos del equipo que el listado de vencimientos necesita mostrar."""
    id: int
    numero_serie: str
    nombre: str
    tipo: TipoEquipo

    model_config = ConfigDict(from_attributes=True)


class SectorResumen(BaseModel):
    id: int
    nombre: str

    model_config = ConfigDict(from_attributes=True)


class VencimientoCalibracion(BaseModel):
    id: int  # id del equipo
    fecha_vencimiento: date
    fecha_ultima_calibracion: date
    periodicidad_dias: int
    equipo: EquipoResumen
    sector: Optional[SectorResumen] = None
    estado: EstadoVencimiento
    dias_restantes: int  # negativo si ya venció

    model_config = ConfigDict(from_attributes=True)
