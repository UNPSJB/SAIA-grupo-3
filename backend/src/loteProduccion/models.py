from datetime import date, datetime
from typing import Optional

from sqlalchemy import Date, DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.models import ModeloBase
from src.personal.models import Personal
from src.producto.models import Producto
from src.loteProduccion.constants import EstadoLote


class LoteProduccion(ModeloBase):
    __tablename__ = "lotes_produccion"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    codigo: Mapped[str] = mapped_column(String(30), unique=True, nullable=False, index=True)
    producto_id: Mapped[int] = mapped_column(ForeignKey("productos.id"), nullable=False, index=True)
    fecha_produccion: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    cantidad: Mapped[float] = mapped_column(nullable=False)
    observaciones: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    registrado_por_id: Mapped[int] = mapped_column(ForeignKey("personal.id"), nullable=False)
    fecha_registro: Mapped[datetime] = mapped_column(DateTime, default=datetime.now, nullable=False)
    activo: Mapped[bool] = mapped_column(default=True, nullable=False)

    estado: Mapped[str] = mapped_column(String(20), default=EstadoLote.ABIERTO, nullable=False, index=True)
    fecha_cierre: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    cerrado_por_id: Mapped[Optional[int]] = mapped_column(ForeignKey("personal.id"), nullable=True)

    producto: Mapped[Producto] = relationship("Producto")
    registrado_por: Mapped[Personal] = relationship("Personal", foreign_keys=[registrado_por_id])
    cerrado_por: Mapped[Optional[Personal]] = relationship("Personal", foreign_keys=[cerrado_por_id])
