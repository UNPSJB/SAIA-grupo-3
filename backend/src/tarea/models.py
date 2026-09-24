from typing import Optional, List
from sqlalchemy import Column, ForeignKey, String, Table
from sqlalchemy.orm import Mapped, mapped_column, relationship
from enum import auto, StrEnum
from src.models import ModeloBase

class FrecuenciaTarea(StrEnum):
    DIARIA = auto()
    SEMANAL = auto()
    MENSUAL = auto()

tarea_elemento_association = Table(
    "tarea_elemento",
    ModeloBase.metadata,
    Column("tarea_id", ForeignKey("tareas.id", ondelete="CASCADE"), primary_key=True),
    Column("elemento_id", ForeignKey("elemento-limpieza.id", ondelete="CASCADE"), primary_key=True)
)

tarea_insumo_association = Table(
    "tarea_insumo",
    ModeloBase.metadata,
    Column("tarea_id", ForeignKey("tareas.id", ondelete="CASCADE"), primary_key=True),
    Column("insumo_id", ForeignKey("insumos.id", ondelete="CASCADE"), primary_key=True)
)

class Tarea(ModeloBase):
    __tablename__ = "tareas"

    id: Mapped[int] = mapped_column(primary_key=True, index=True, autoincrement=True)
    nombre: Mapped[str] = mapped_column(String(150), nullable=False)
    frecuencia: Mapped[FrecuenciaTarea] = mapped_column(nullable=False)
    procedimiento: Mapped[str] = mapped_column(String(2000), nullable=False)
    
    equipo_id: Mapped[Optional[int]] = mapped_column(ForeignKey("equipos.id"), nullable=True)

    equipo = relationship("src.equipos.models.Equipo")
    elementos = relationship("src.elementos.models.Elemento", secondary=tarea_elemento_association)
    insumos = relationship("src.insumos.models.Insumo", secondary=tarea_insumo_association)