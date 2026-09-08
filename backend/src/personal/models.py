from typing import Optional, List
from sqlalchemy.orm import Mapped, mapped_column, relationship
from enum import auto, StrEnum
from src.models import ModeloBase

class TipoCapacidad(StrEnum):
    ADMINISTRAR = auto()
    OPERAR = auto()
    OPERAR_ADMINISTRAR = auto()

class Personal(ModeloBase):
    __tablename__ = "personal"

    dni: Mapped[int] = mapped_column(primary_key=True,unique=True, index=True)
    nroLegajo: Mapped[int] = mapped_column(unique=True, index=True)
    nombre: Mapped[str] = mapped_column(index=True)
    apellido: Mapped[str] = mapped_column(index=True)
    email: Mapped[str] = mapped_column(unique=True, index=True)
    tipo_capacidad: Mapped[TipoCapacidad] = mapped_column()
    documentos: Mapped[Optional[List["src.documentacion.models.Documentacion"]]] = relationship(
        "src.documentacion.models.Documentacion", back_populates="personal"
    )
