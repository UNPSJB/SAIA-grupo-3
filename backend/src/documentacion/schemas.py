from datetime import date
from typing import Annotated, Literal, Union
from pydantic import BaseModel, ConfigDict, Field
from src.documentacion.constants import EstadoVencimiento
from src.registroCalibracion.schemas import EquipoResumen, SectorResumen
from src.tipoDocumento.schemas import TipoDocumento


class DocumentoBase(BaseModel):
    tipo_documento_id: int = Field(gt=0)
    fecha_vencimiento: date


class DocumentoCreate(DocumentoBase):
    personal_id: int = Field(gt=0)


class DocumentoUpdate(DocumentoBase):
    pass


class Documento(DocumentoBase):
    id: int
    tipo_documento: TipoDocumento
    personal_id: int
    nombre_personal: str

    model_config = ConfigDict(from_attributes=True)


class DocumentoDelete(Documento):
    pass


class EmpleadoResumen(BaseModel):

    id: int
    dni: str
    nroLegajo: str
    nombre: str
    apellido: str

    model_config = ConfigDict(from_attributes=True)

class Vencimiento(BaseModel):
    id: int
    fecha_vencimiento: date
    tipo_documento: TipoDocumento
    personal: EmpleadoResumen
    estado: EstadoVencimiento
    dias_restantes: int  # negativo si ya venció

    model_config = ConfigDict(from_attributes=True)


class VencimientoDocumentacion(BaseModel):
    id: int
    detalle_id: int
    origen: Literal["documentacion"]
    fecha_vencimiento: date
    tipo_documento: TipoDocumento
    personal: EmpleadoResumen
    estado: EstadoVencimiento
    dias_restantes: int

    model_config = ConfigDict(from_attributes=True)


class VencimientoCalibracion(BaseModel):
    id: int
    detalle_id: int
    origen: Literal["calibracion"]
    fecha_vencimiento: date
    fecha_ultima_calibracion: date
    periodicidad_dias: int
    equipo: EquipoResumen
    sector: SectorResumen | None = None
    estado: EstadoVencimiento
    dias_restantes: int

    model_config = ConfigDict(from_attributes=True)


VencimientoConsolidado = Annotated[
    Union[VencimientoDocumentacion, VencimientoCalibracion],
    Field(discriminator="origen"),
]
