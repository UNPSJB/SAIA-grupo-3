from datetime import datetime
from typing import Optional, List
from sqlalchemy import ForeignKey, String, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from src.models import ModeloBase

class PlanRealizado(ModeloBase):
    __tablename__ = "planes_realizados"

    id: Mapped[int] = mapped_column(primary_key=True, index=True, autoincrement=True)
    

    plan_origen_id: Mapped[Optional[int]] = mapped_column(ForeignKey("planes.id", ondelete="SET NULL"), nullable=True)
    
    nombre: Mapped[str] = mapped_column(String(100), nullable=False)
    descripcion: Mapped[str] = mapped_column(String(250), nullable=False)
    fecha_ejecucion: Mapped[datetime] = mapped_column(DateTime, default=func.now(), nullable=False)

    responsable_id: Mapped[int] = mapped_column(ForeignKey("personal.dni"), nullable=False)
    sector_id: Mapped[Optional[int]] = mapped_column(ForeignKey("sectores.id"), nullable=True)
    equipo_id: Mapped[Optional[int]] = mapped_column(ForeignKey("equipos.id"), nullable=True)

  
    plan_origen = relationship("src.plan.models.Plan")
    responsable = relationship("src.personal.models.Personal")
    sector = relationship("src.sector.models.Sector")
    equipo = relationship("src.equipos.models.Equipo")
    

    tareas_realizadas: Mapped[List["src.tareaRealizada.models.TareaRealizada"]] = relationship(
        "src.tareaRealizada.models.TareaRealizada",
        back_populates="plan_realizado",
        cascade="all, delete-orphan"
    )