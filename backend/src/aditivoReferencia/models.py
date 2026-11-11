from typing import Optional

from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.claseFuncional.models import ClaseFuncional
from src.models import ModeloBase


class AditivoReferencia(ModeloBase):
    __tablename__ = "aditivos_referencia"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    clase_funcional_id: Mapped[int] = mapped_column(ForeignKey("clases_funcionales.id"), nullable=False, index=True)
    nombre: Mapped[str] = mapped_column(String(150), nullable=False, index=True)
    ins: Mapped[Optional[str]] = mapped_column(String(15), nullable=True, index=True)
    activo: Mapped[bool] = mapped_column(default=True, nullable=False)

    clase_funcional: Mapped[ClaseFuncional] = relationship("ClaseFuncional", lazy="joined")
