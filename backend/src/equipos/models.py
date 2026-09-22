from typing import TYPE_CHECKING
from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from enum import auto, StrEnum
from src.models import ModeloBase

if TYPE_CHECKING:
    from src.sector.models import Sector


class TipoEquipo(StrEnum):
    HERRAMIENTA = auto()
    EQUIPO = auto()
    INSTRUMENTO = auto()


class Equipo(ModeloBase):
    __tablename__ = "equipos"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    
    numero_serie: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    nombre: Mapped[str] = mapped_column(nullable=False, index=True)
    tipo: Mapped[TipoEquipo] = mapped_column(nullable=False)
    activo: Mapped[bool] = mapped_column(default=True, nullable=False)

    sector_id: Mapped[int] = mapped_column(ForeignKey("sectores.id"), nullable=False)
    sector: Mapped["Sector"] = relationship("Sector", back_populates="equipos")

    # =========================================================================
    # EXTENSIONES FUTURAS (Sprint 1 y Sprint 2):
    # - E2 (POES / Limpieza): Tareas de limpieza asignadas al equipo.
    #   tareas_limpieza: Mapped[list["TareaLimpieza"]] = relationship(back_populates="equipo")
    # - E4 (Mantenimiento y Calibración): Planes o registros de calibración.
    #   calibraciones: Mapped[list["PlanCalibracion"]] = relationship(back_populates="equipo")
    # =========================================================================