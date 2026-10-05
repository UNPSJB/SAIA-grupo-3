from datetime import datetime
from enum import auto, StrEnum
from typing import Optional
from sqlalchemy import String, DateTime
from sqlalchemy.orm import Mapped, mapped_column
from src.models import ModeloBase

class TipoNotificacion(StrEnum):
    VENCIMIENTO_DOCUMENTACION = auto()

class Notificacion(ModeloBase):
    __tablename__ = "notificaciones"

    id: Mapped[int] = mapped_column(primary_key=True, index=True, autoincrement=True)
    tipo: Mapped[TipoNotificacion] = mapped_column(nullable=False)
    titulo: Mapped[str] = mapped_column(String(100), nullable=False)
    mensaje: Mapped[str] = mapped_column(String(250), nullable=False)

    clave: Mapped[str] = mapped_column(String(100), unique=True, nullable=False) # formato "vencimientos-2026-10-05"
    enlace: Mapped[Optional[str]] = mapped_column(String(200), nullable=True) # es para que lo redirija a la lista ya filtrada
    fecha_creacion: Mapped[datetime] = mapped_column(DateTime, default=datetime.now, nullable=False)
    leida: Mapped[bool] = mapped_column(default=False, nullable=False)
