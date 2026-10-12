from datetime import date, datetime
from typing import Optional
from sqlalchemy import ForeignKey, String, Date, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from src.models import ModeloBase


class RegistroCalibracion(ModeloBase):
    __tablename__ = "registros_calibracion"

    id: Mapped[int] = mapped_column(primary_key=True, index=True, autoincrement=True)
    equipo_id: Mapped[int] = mapped_column(ForeignKey("equipos.id"), nullable=False, index=True)
    
    fecha_calibracion: Mapped[date] = mapped_column(Date, nullable=False)
    fecha_vencimiento_calculada: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    
    certificado_path: Mapped[str] = mapped_column(String(255), nullable=False)
    
    otorgado_por: Mapped[str] = mapped_column(String(150), nullable=False)
    
    fecha_registro: Mapped[datetime] = mapped_column(DateTime, default=datetime.now, nullable=False)
    activo: Mapped[bool] = mapped_column(default=True, nullable=False)

    equipo = relationship("src.equipos.models.Equipo")