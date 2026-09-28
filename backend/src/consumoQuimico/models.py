from sqlalchemy import ForeignKey, String, Date
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import date
from src.models import ModeloBase
from src.insumosQuimicos.models import InsumoQuimico
from src.personal.models import Personal

class ConsumoQuimico(ModeloBase):
    __tablename__ = "consumos_quimicos"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    insumo_quimico_id: Mapped[int] = mapped_column(ForeignKey("insumos_quimicos.id"), nullable=False)
    cantidad_utilizada: Mapped[float] = mapped_column(nullable=False)
    fecha: Mapped[date] = mapped_column(default=date.today, nullable=False)
    tarea_limpieza: Mapped[str] = mapped_column(String(200), nullable=False) 
    operario_id: Mapped[int] = mapped_column(ForeignKey("personal.dni"), nullable=True)
    activo: Mapped[bool] = mapped_column(default=True, nullable=False)
    insumo: Mapped["InsumoQuimico"] = relationship("InsumoQuimico")
    operario: Mapped["Personal"] = relationship("Personal")