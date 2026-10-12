from datetime import datetime
from enum import StrEnum, auto
from typing import Optional

from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, Session, mapped_column, relationship

from src.models import ModeloBase


class AccionMovimientoIncidente(StrEnum):
    REPORTADO = auto()
    CERRADO = auto()
    REABIERTO = auto()


class MovimientoIncidente(ModeloBase):
    __tablename__ = "movimientos_incidente"

    id: Mapped[int] = mapped_column(primary_key=True, index=True, autoincrement=True)
    # ondelete CASCADE: si se elimina el incidente, su historial se va con él
    incidente_id: Mapped[int] = mapped_column(
        ForeignKey("incidentes.id", ondelete="CASCADE"), nullable=False, index=True
    )
    accion: Mapped[AccionMovimientoIncidente] = mapped_column(String(20), nullable=False)
    personal_id: Mapped[int] = mapped_column(ForeignKey("personal.id"), nullable=False)
    fecha_hora: Mapped[datetime] = mapped_column(DateTime, default=datetime.now, nullable=False)
    motivo: Mapped[Optional[str]] = mapped_column(String(1000), nullable=True)

    personal = relationship("src.personal.models.Personal")


def registrar_movimiento(
    db: Session,
    incidente_id: int,
    accion: AccionMovimientoIncidente,
    personal_id: int,
    motivo: str | None = None,
) -> MovimientoIncidente:
    """Agrega un movimiento a la sesión. NO hace commit: lo hace quien llama,
    así el cambio de estado y su registro se guardan juntos o no se guarda ninguno."""
    movimiento = MovimientoIncidente(
        incidente_id=incidente_id,
        accion=accion,
        personal_id=personal_id,
        fecha_hora=datetime.now(),
        motivo=motivo,
    )
    db.add(movimiento)
    db.flush()
    return movimiento
