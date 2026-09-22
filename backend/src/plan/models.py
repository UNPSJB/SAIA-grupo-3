from typing import Optional
from sqlalchemy import Column, ForeignKey, String, Table
from sqlalchemy.orm import Mapped, mapped_column, relationship
from enum import auto, StrEnum
from src.models import ModeloBase

class FrecuenciaPlan(StrEnum):
    DIARIO = auto()
    SEMANAL = auto()
    MENSUAL = auto()

plan_tarea_association = Table(
    "plan_tarea",
    ModeloBase.metadata,
    Column("plan_id", ForeignKey("planes.id", ondelete="CASCADE"), primary_key=True),
    Column("tarea_id", ForeignKey("tareas.id", ondelete="CASCADE"), primary_key=True)
)

class Plan(ModeloBase):
    __tablename__ = "planes"

    id: Mapped[int] = mapped_column(primary_key=True, index=True, autoincrement=True)
    nombre: Mapped[str] = mapped_column(String(100), nullable=False)
    frecuencia: Mapped[FrecuenciaPlan] = mapped_column(nullable=False)
    activo: Mapped[bool] = mapped_column(default=True, nullable=False)

    responsable_id: Mapped[int] = mapped_column(ForeignKey("personal.dni"), nullable=False)
    
    # Ambos son opcionales en la BD
    sector_id: Mapped[Optional[int]] = mapped_column(ForeignKey("sectores.id"), nullable=True)
    equipo_id: Mapped[Optional[int]] = mapped_column(ForeignKey("equipos.id"), nullable=True)

    responsable = relationship("src.personal.models.Personal")
    sector = relationship("src.sector.models.Sector")
    equipo = relationship("src.equipos.models.Equipo")
    
    tareas = relationship("src.tarea.models.Tarea", secondary=plan_tarea_association)