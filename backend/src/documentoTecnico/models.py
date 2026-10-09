from datetime import datetime, timezone
from enum import auto, StrEnum
from typing import List, Optional
from sqlalchemy import DateTime, ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from src.models import ModeloBase

class TipoDocumentoTecnico(StrEnum):
    MANUAL_BPM = auto()
    FICHA_TECNICA = auto()
    PROCEDIMIENTO = auto()
    RECETA = auto()

class EstadoDocumento(StrEnum):
    VIGENTE = auto()
    ARCHIVADO = auto()


class DocumentoTecnico(ModeloBase):
    __tablename__ = "documentos_tecnicos"

    id: Mapped[int] = mapped_column(primary_key=True, index=True, autoincrement=True)
    nombre: Mapped[str] = mapped_column(String(150), nullable=False, index=True)
    descripcion: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    tipo: Mapped[TipoDocumentoTecnico] = mapped_column(nullable=False)
    # Archivado = el documento entero dejó de usarse (ej: una receta discontinuada)
    estado: Mapped[EstadoDocumento] = mapped_column(default=EstadoDocumento.VIGENTE, nullable=False)
    fecha_creacion: Mapped[datetime] = mapped_column(DateTime, default=datetime.now, nullable=False)

    #la relacion va a traer todos los documentos que se subieron
    versiones: Mapped[List["VersionDocumentoTecnico"]] = relationship(
        back_populates="documento",
        order_by="VersionDocumentoTecnico.numero.desc()"
    )

    cambios_vigencia: Mapped[List["CambioVigenciaDocumentoTecnico"]] = relationship(
        back_populates="documento", order_by="CambioVigenciaDocumentoTecnico.id.desc()"
    )

    @property
    def vigencia_actual(self) -> Optional["CambioVigenciaDocumentoTecnico"]:
        vigente = self.version_vigente
        if self.cambios_vigencia and vigente:
            ultimo = self.cambios_vigencia[0]
            if ultimo.version_id == vigente.id:
                return ultimo
        return None

    @property
    def version_vigente(self) -> Optional["VersionDocumentoTecnico"]:
        for v in self.versiones:
            if v.estado == EstadoDocumento.VIGENTE:
                return v
        return None 


#con esta tabla guardamos el historial y evitamoms que los documentos que se carguen, se pisen entre ellos
class VersionDocumentoTecnico(ModeloBase):
    __tablename__ = "versiones_documento_tecnico"
    __table_args__ = (UniqueConstraint("documento_id", "numero"),) #regla para que no existan dos filas con la misma combinacion

    id: Mapped[int] = mapped_column(primary_key=True, index=True, autoincrement=True)
    documento_id: Mapped[int] = mapped_column(ForeignKey("documentos_tecnicos.id"), nullable=False, index=True)
    numero: Mapped[int] = mapped_column(nullable=False)
    estado: Mapped[EstadoDocumento] = mapped_column(default=EstadoDocumento.VIGENTE, nullable=False)

    archivo_nombre: Mapped[str] = mapped_column(String(255), nullable=False)
    nombre_original: Mapped[str] = mapped_column(String(255), nullable=False)
    tipo_contenido: Mapped[str] = mapped_column(String(100), nullable=False)
    tamanio_bytes: Mapped[int] = mapped_column(nullable=False)
    comentario: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    fecha_subida: Mapped[datetime] = mapped_column(DateTime, default=datetime.now, nullable=False)
    subido_por_id: Mapped[int] = mapped_column(ForeignKey("personal.id"), nullable=False)

    documento: Mapped[DocumentoTecnico] = relationship(back_populates="versiones")
    subido_por = relationship("src.personal.models.Personal")


class CambioVigenciaDocumentoTecnico(ModeloBase):
    __tablename__ = "cambios_vigencia_documento_tecnico"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    documento_id: Mapped[int] = mapped_column(ForeignKey("documentos_tecnicos.id"), nullable=False, index=True)
    version_anterior_id: Mapped[Optional[int]] = mapped_column(ForeignKey("versiones_documento_tecnico.id"), nullable=True)
    version_id: Mapped[int] = mapped_column(ForeignKey("versiones_documento_tecnico.id"), nullable=False)
    personal_id: Mapped[int] = mapped_column(ForeignKey("personal.id"), nullable=False)
    fecha_vigencia: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    documento: Mapped["DocumentoTecnico"] = relationship(back_populates="cambios_vigencia")
    personal = relationship("src.personal.models.Personal")
