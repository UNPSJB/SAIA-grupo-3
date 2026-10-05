from datetime import date
from sqlalchemy import Date, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from enum import auto, StrEnum
from src.models import ModeloBase

class TipoDocumento(StrEnum):
    CARNET_MANIPULADOR = auto()
    LIBRETA_SANITARIA = auto()
    PSICOFISICO = auto()
    CERTIFICADO_SALUD = auto()
    CAPACITACION = auto()


class Documentacion(ModeloBase):
    __tablename__ = "documentacion"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    nombre: Mapped[str] = mapped_column(index=True)
    tipo_documento: Mapped[TipoDocumento] = mapped_column() 
    fecha_vencimiento: Mapped[date | None] = mapped_column(Date, nullable=True)
    personal_id: Mapped[int] = mapped_column(
        ForeignKey("personal.dni")
    )  
    personal: Mapped["src.personal.models.Personal"] = relationship(
        "src.personal.models.Personal", back_populates="documentos"
    )

    @property
    def nombre_personal(self):
        return self.personal.nombre
