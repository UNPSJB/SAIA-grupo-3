from datetime import date, datetime
from enum import auto, StrEnum
from typing import Optional, List
from sqlalchemy import ForeignKey, Date, DateTime, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from src.models import ModeloBase
from src.tarea.models import FrecuenciaTarea

class EstadoItem(StrEnum):
    PENDIENTE = auto()
    REALIZADA = auto()

class AccionMovimiento(StrEnum):
    REALIZADA = auto()
    ANULADA = auto()

class ItemChecklist(ModeloBase):
    __tablename__ = "items_checklist"
    __table_args__ = (UniqueConstraint("plan_id", "tarea_id", "frecuencia", "periodo_inicio"),)

    id: Mapped[int] = mapped_column(primary_key=True, index=True, autoincrement=True)
    plan_id: Mapped[int] = mapped_column(ForeignKey("planes.id"), nullable=False, index=True)
    tarea_id: Mapped[int] = mapped_column(ForeignKey("tareas.id"), nullable=False, index=True)
    
    # CORRECCIÓN: Dejamos únicamente las FK por ID
    responsable_id: Mapped[int] = mapped_column(ForeignKey("personal.id"), nullable=False, index=True)
    realizada_por_id: Mapped[Optional[int]] = mapped_column(ForeignKey("personal.id"), nullable=True)

    frecuencia: Mapped[FrecuenciaTarea] = mapped_column(nullable=False)
    periodo_inicio: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    periodo_fin: Mapped[date] = mapped_column(Date, nullable=False)

    estado: Mapped[EstadoItem] = mapped_column(default=EstadoItem.PENDIENTE, nullable=False)
    realizada_en: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    foto_path: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    plan = relationship("src.plan.models.Plan")
    tarea = relationship("src.tarea.models.Tarea")
    movimientos: Mapped[List["MovimientoItemChecklist"]] = relationship(
        back_populates="item", order_by="MovimientoItemChecklist.fecha_hora"
    )

class MovimientoItemChecklist(ModeloBase):
    __tablename__ = "movimientos_item_checklist"

    id: Mapped[int] = mapped_column(primary_key=True, index=True, autoincrement=True)
    item_id: Mapped[int] = mapped_column(ForeignKey("items_checklist.id"), nullable=False, index=True)
    accion: Mapped[AccionMovimiento] = mapped_column(nullable=False)
    personal_id: Mapped[int] = mapped_column(ForeignKey("personal.id"), nullable=False)
    fecha_hora: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    foto_path: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    motivo: Mapped[Optional[str]] = mapped_column(String(250), nullable=True)

    item: Mapped[ItemChecklist] = relationship(back_populates="movimientos")