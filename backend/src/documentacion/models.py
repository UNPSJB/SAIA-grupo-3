from datetime import date
from sqlalchemy import Date, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from src.models import ModeloBase
from src.tipoDocumento.models import TipoDocumento


class Documentacion(ModeloBase):
    __tablename__ = "documentacion"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    tipo_documento_id: Mapped[int] = mapped_column(
        ForeignKey("tipo_documento.id"), nullable=False
    )
    fecha_vencimiento: Mapped[date | None] = mapped_column(Date, nullable=True)
    personal_id: Mapped[int] = mapped_column(ForeignKey("personal.id"))
    personal: Mapped["src.personal.models.Personal"] = relationship(
        "src.personal.models.Personal", back_populates="documentos"
    )
    tipo_documento: Mapped[TipoDocumento] = relationship(
        "TipoDocumento", back_populates="documentos"
    )

    @property
    def nombre_personal(self):
        return self.personal.nombre
