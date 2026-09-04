from typing import Optional, List
from sqlalchemy.orm import Mapped, mapped_column, relationship
from src.models import ModeloBase


class Personal(ModeloBase):
    __tablename__ = "personal"

    dni: Mapped[int] = mapped_column(primary_key=True,unique=True, index=True)
    nroLegajo: Mapped[int] = mapped_column(unique=True, index=True)
    nombre: Mapped[str] = mapped_column(index=True)
    apellido: Mapped[str] = mapped_column(index=True)
    email: Mapped[str] = mapped_column(unique=True, index=True)
    documentos: Mapped[Optional[List["src.documentacion.models.Documentacion"]]] = relationship(
        "src.documentacion.models.Documentacion", back_populates="personal"
    )
