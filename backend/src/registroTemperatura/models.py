from datetime import datetime
from typing import Optional
from sqlalchemy import ForeignKey, Float, DateTime, Boolean, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from src.models import ModeloBase

class RegistroTemperatura(ModeloBase):
    __tablename__ = "registros_temperatura"

    id: Mapped[int] = mapped_column(primary_key=True, index=True, autoincrement=True)
    equipo_id: Mapped[int] = mapped_column(ForeignKey("equipos.id"), nullable=False, index=True)
    operario_id: Mapped[int] = mapped_column(ForeignKey("personal.id"), nullable=False)
    
    temperatura_registrada: Mapped[float] = mapped_column(Float, nullable=False)
    fecha_hora_registro: Mapped[datetime] = mapped_column(DateTime, default=datetime.now, nullable=False)
    
    fuera_de_rango: Mapped[bool] = mapped_column(Boolean, nullable=False)
    accion_tomada: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    equipo = relationship("src.equipos.models.Equipo")
    operario = relationship("src.personal.models.Personal")