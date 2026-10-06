from datetime import date
from pydantic import BaseModel, ConfigDict, Field
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
