from sqlalchemy import ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from enum import auto, StrEnum
from src.models import ModeloBase


class TipoUnidadMedida(StrEnum):
    PESO = auto()
    LONGITUD = auto()
    CAPACIDAD = auto()
    UNIDAD = auto()

class UnidadMedida(ModeloBase):
    __tablename__ = "unidad_medida"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    tipo: Mapped[TipoUnidadMedida] = mapped_column(nullable=False)
    sufijo: Mapped[str] = mapped_column(nullable=False)
    insumos = relationship("Insumo", back_populates="unidadMedidaObj")
    