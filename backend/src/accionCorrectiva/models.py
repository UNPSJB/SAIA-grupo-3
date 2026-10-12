from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.models import ModeloBase


class AccionCorrectiva(ModeloBase):
    """Evidencia de cómo se resolvió un incidente. Cada cierre genera una.

    Un incidente puede cerrarse, reabrirse y volver a cerrarse: por eso puede tener
    varias acciones, pero solo una "vigente" (la del cierre actual). Nunca se borran.
    """
    __tablename__ = "acciones_correctivas"

    id: Mapped[int] = mapped_column(primary_key=True, index=True, autoincrement=True)
    incidente_id: Mapped[int] = mapped_column(
        ForeignKey("incidentes.id", ondelete="CASCADE"), nullable=False, index=True
    )
    descripcion: Mapped[str] = mapped_column(String(1000), nullable=False)
    # Responsable y fecha los completa el backend (usuario logueado y hora del servidor)
    responsable_id: Mapped[int] = mapped_column(ForeignKey("personal.id"), nullable=False)
    fecha_cierre: Mapped[datetime] = mapped_column(DateTime, default=datetime.now, nullable=False)
    vigente: Mapped[bool] = mapped_column(default=True, nullable=False)

    responsable = relationship("src.personal.models.Personal")
    incidente = relationship("src.incidente.models.Incidente")
