from sqlalchemy.orm import Mapped, mapped_column, relationship
from src.models import ModeloBase


class TipoDocumento(ModeloBase):
    __tablename__ = "tipo_documento"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    nombre: Mapped[str] = mapped_column(nullable=False, index=True)
    activo: Mapped[bool] = mapped_column(default=True, nullable=False)
    documentos: Mapped[list["src.documentacion.models.Documentacion"]] = relationship(
        "src.documentacion.models.Documentacion", back_populates="tipo_documento"
    )
