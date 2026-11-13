from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.models import ModeloBase
from src.produccionDelDia.constants import AccionPasoLote, EstadoPasoLote


class PasoLote(ModeloBase):
    __tablename__ = "pasos_lote"
    __table_args__ = (UniqueConstraint("lote_id", "orden", name="uq_paso_lote_orden"),)

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    lote_id: Mapped[int] = mapped_column(ForeignKey("lotes_produccion.id"), nullable=False, index=True)
    paso_receta_id: Mapped[Optional[int]] = mapped_column(ForeignKey("pasos_receta.id"), nullable=True)
    orden: Mapped[int] = mapped_column(nullable=False)
    nombre: Mapped[str] = mapped_column(String(150), nullable=False)
    procedimiento: Mapped[str] = mapped_column(String(2000), nullable=False)
    equipo_id: Mapped[Optional[int]] = mapped_column(ForeignKey("equipos.id"), nullable=True)
    tiempo_minutos: Mapped[Optional[int]] = mapped_column(nullable=True)
    temperatura_celsius: Mapped[Optional[float]] = mapped_column(nullable=True)
    punto_control: Mapped[bool] = mapped_column(default=False, nullable=False)

    estado: Mapped[EstadoPasoLote] = mapped_column(default=EstadoPasoLote.PENDIENTE, nullable=False)
    realizado_por_id: Mapped[Optional[int]] = mapped_column(ForeignKey("personal.id"), nullable=True)
    realizado_en: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    valor_medido: Mapped[Optional[float]] = mapped_column(nullable=True)
    observacion: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    foto_path: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    lote = relationship("src.loteProduccion.models.LoteProduccion", back_populates="pasos")
    equipo = relationship("src.equipos.models.Equipo")
    realizado_por = relationship("src.personal.models.Personal")
    movimientos: Mapped[list["MovimientoPasoLote"]] = relationship(
        back_populates="paso",
        order_by="[MovimientoPasoLote.fecha_hora, MovimientoPasoLote.id]",
        cascade="all, delete-orphan",
    )


class MovimientoPasoLote(ModeloBase):
    __tablename__ = "movimientos_paso_lote"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    paso_id: Mapped[int] = mapped_column(ForeignKey("pasos_lote.id"), nullable=False, index=True)
    accion: Mapped[AccionPasoLote] = mapped_column(nullable=False)
    personal_id: Mapped[int] = mapped_column(ForeignKey("personal.id"), nullable=False)
    fecha_hora: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    valor_medido: Mapped[Optional[float]] = mapped_column(nullable=True)
    observacion: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    foto_path: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    motivo: Mapped[Optional[str]] = mapped_column(String(250), nullable=True)

    paso: Mapped[PasoLote] = relationship(back_populates="movimientos")
    personal = relationship("src.personal.models.Personal")
