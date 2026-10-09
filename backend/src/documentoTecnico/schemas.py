from datetime import datetime, timezone
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field, field_validator
from src.checklist.schemas import PersonalResumen
from src.documentoTecnico.models import TipoDocumentoTecnico, EstadoDocumento


class DocumentoTecnicoBase(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)  # saca espacios al inicio/fin de todos los textos
    
    nombre: str = Field(min_length=1, max_length=150)
    tipo: TipoDocumentoTecnico
    descripcion: Optional[str] = Field(None, max_length=500)

    @field_validator("descripcion", mode="before")
    @classmethod  #evita guardar espacios las descripciones, en su lugar guarda none
    def descripcion_vacia_es_nula(cls, valor):
        if isinstance(valor, str):
            valor = valor.strip()
            if valor == "":
                return None
            return valor
        return valor


class VersionDocumentoTecnico(BaseModel):
    id: int
    numero: int
    estado: EstadoDocumento
    nombre_original: str
    tipo_contenido: str
    tamanio_bytes: int
    comentario: Optional[str] = None
    fecha_subida: datetime
    subido_por: PersonalResumen

    model_config = ConfigDict(from_attributes=True)


class VigenciaDocumentoTecnico(BaseModel):
    version_anterior_id: Optional[int]
    version_id: int
    personal: PersonalResumen
    fecha_vigencia: datetime

    model_config = ConfigDict(from_attributes=True)

    @field_validator("fecha_vigencia")
    @classmethod
    def fecha_con_zona(cls, valor: datetime) -> datetime:
        # SQLite conserva UTC sin el offset; la API lo explicita para el navegador.
        return valor.replace(tzinfo=timezone.utc) if valor.tzinfo is None else valor


class DocumentoTecnicoResumen(DocumentoTecnicoBase):
    id: int
    estado: EstadoDocumento
    fecha_creacion: datetime
    version_vigente: Optional[VersionDocumentoTecnico] = None
    vigencia_actual: Optional[VigenciaDocumentoTecnico] = None

    model_config = ConfigDict(from_attributes=True)


class DocumentoTecnico(DocumentoTecnicoResumen):
    versiones: List[VersionDocumentoTecnico] = []
