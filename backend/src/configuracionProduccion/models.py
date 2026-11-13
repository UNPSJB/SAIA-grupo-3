from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.configuracionProduccion.constants import FORMATO_POR_DEFECTO, FormatoAditivos
from src.models import ModeloBase


class ConfiguracionProduccion(ModeloBase):
    __tablename__ = "configuracion_produccion"

    id: Mapped[int] = mapped_column(primary_key=True)
    formato_aditivos: Mapped[FormatoAditivos] = mapped_column(default=FORMATO_POR_DEFECTO, nullable=False)
    actualizado_por_id: Mapped[Optional[int]] = mapped_column(ForeignKey("personal.id"), nullable=True)
    actualizado_en: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    actualizado_por = relationship("src.personal.models.Personal")
