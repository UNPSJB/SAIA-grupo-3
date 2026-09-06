from sqlalchemy.orm import Mapped, mapped_column
from enum import auto, StrEnum
from src.models import ModeloBase

class TipoEquipo(StrEnum):
    HERRAMIENTA = auto()
    EQUIPO= auto()
    INSTRUMENTO = auto()


class Equipo(ModeloBase):
    __tablename__ = "equipos"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    nombre: Mapped[str] = mapped_column(nullable=False, index=True)
    tipo: Mapped[TipoEquipo] = mapped_column(nullable=False)  # ej.: "Equipo", "Herramienta", etc.
    ubicacion: Mapped[str] = mapped_column(nullable=False)

    
