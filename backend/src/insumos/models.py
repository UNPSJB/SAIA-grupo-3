from sqlalchemy import ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from enum import auto, StrEnum
from src.models import ModeloBase
from src.unidadMedida.models import UnidadMedida
    

class Insumo(ModeloBase):
    __tablename__ = "insumos"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    nombre: Mapped[str] = mapped_column(nullable=False)
    cantidad: Mapped[float] = mapped_column(nullable=False)
    unidadMedida: Mapped[int] = mapped_column(ForeignKey("unidad_medida.id"), nullable=False)
    unidadMedidaObj: Mapped[UnidadMedida] = relationship("UnidadMedida", back_populates="insumos")
    