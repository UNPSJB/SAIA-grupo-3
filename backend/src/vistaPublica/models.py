from datetime import datetime
from typing import Optional

from sqlalchemy import Boolean, DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.models import ModeloBase


class ConfiguracionVistaPublica(ModeloBase):

    __tablename__ = "configuracion_vista_publica"

    id: Mapped[int] = mapped_column(primary_key=True, index=True, autoincrement=True)
    activa: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    token: Mapped[Optional[str]] = mapped_column(String(100), unique=True, index=True, nullable=True)

    indicadores_habilitados: Mapped[str] = mapped_column(String(500), default="cumplimiento", nullable=False)
    fecha_actualizacion: Mapped[datetime] = mapped_column(DateTime, default=datetime.now, nullable=False)
    actualizado_por_id: Mapped[Optional[int]] = mapped_column(ForeignKey("personal.id"), nullable=True)

    actualizado_por = relationship("src.personal.models.Personal")