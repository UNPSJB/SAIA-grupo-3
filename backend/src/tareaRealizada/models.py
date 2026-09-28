from datetime import datetime
from typing import Optional
from sqlalchemy import ForeignKey, String, DateTime, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from src.models import ModeloBase
from src.tarea.models import FrecuenciaTarea

class TareaRealizada(ModeloBase):
    __tablename__ = "tareas_realizadas"

    id: Mapped[int] = mapped_column(primary_key=True, index=True, autoincrement=True)
    

    plan_realizado_id: Mapped[int] = mapped_column(ForeignKey("planes_realizados.id", ondelete="CASCADE"), nullable=False)
    

    tarea_origen_id: Mapped[Optional[int]] = mapped_column(ForeignKey("tareas.id", ondelete="SET NULL"), nullable=True)
    

    nombre: Mapped[str] = mapped_column(String(150), nullable=False)
    frecuencia: Mapped[FrecuenciaTarea] = mapped_column(nullable=False)
    procedimiento: Mapped[str] = mapped_column(String(2000), nullable=False)
    fecha_registro: Mapped[datetime] = mapped_column(DateTime, default=func.now(), nullable=False)
    foto_path: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    
    equipo_id: Mapped[Optional[int]] = mapped_column(ForeignKey("equipos.id"), nullable=True)
    

    elementos_utilizados: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    insumos_utilizados: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)


    plan_realizado = relationship("src.planRealizado.models.PlanRealizado", back_populates="tareas_realizadas")
    tarea_origen = relationship("src.tarea.models.Tarea")
    equipo = relationship("src.equipos.models.Equipo")