from typing import TYPE_CHECKING
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String
from src.models import ModeloBase

if TYPE_CHECKING:
    from src.equipos.models import Equipo

class Sector(ModeloBase):
    __tablename__ = "sectores"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    nombre: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    activo: Mapped[bool] = mapped_column(default=True, nullable=False)

    equipos: Mapped[list["Equipo"]] = relationship("Equipo", back_populates="sector",
            primaryjoin="and_(Sector.id == Equipo.sector_id, Equipo.activo == True)"
        )

    # =========================================================================
    # EXTENSIONES FUTURAS:
    # planes: Mapped[list["Plan"]] = relationship("Plan", back_populates="sector")
    # =========================================================================