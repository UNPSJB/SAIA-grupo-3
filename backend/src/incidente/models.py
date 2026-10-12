from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from src.incidente.constants import EstadoIncidente, TipoIncidente
from src.models import ModeloBase


class Incidente(ModeloBase):
    __tablename__ = "incidentes"

    id: Mapped[int] = mapped_column(primary_key=True, index=True, autoincrement=True)
    descripcion: Mapped[str] = mapped_column(String(1000), nullable=False)
    fecha_hora: Mapped[datetime] = mapped_column(
        DateTime, default=func.now(), nullable=False
    )
    estado: Mapped[str] = mapped_column(
        String(20), default=EstadoIncidente.ABIERTO, nullable=False, index=True
    )
    tipo: Mapped[str] = mapped_column(
        String(30), nullable=False, index=True
    )  # uno de TipoIncidente (lo valida el schema)
    reportado_por_dni: Mapped[str] = mapped_column(
        ForeignKey("personal.dni"), nullable=False
    )
    imagen_path: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    reportado_por = relationship("src.personal.models.Personal")
