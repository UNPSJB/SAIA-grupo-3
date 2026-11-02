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
    stock_minimo: Mapped[float | None] = mapped_column(nullable=True, default=None)
    unidad_medida_id: Mapped[int] = mapped_column(ForeignKey("unidad_medida.id"), nullable=False)
    activo: Mapped[bool] = mapped_column(default=True, nullable=False)

    unidadMedidaObj: Mapped[UnidadMedida] = relationship("UnidadMedida", back_populates="insumos")

    @property
    def stock_bajo(self) -> bool:
        return self.stock_minimo is not None and self.cantidad <= self.stock_minimo