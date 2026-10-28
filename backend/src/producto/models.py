from typing import Optional

from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.models import ModeloBase
from src.unidadMedida.models import UnidadMedida


class Producto(ModeloBase):
    __tablename__ = "productos"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    nombre: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    descripcion: Mapped[Optional[str]] = mapped_column(String(250), nullable=True)
    unidad_medida_id: Mapped[int] = mapped_column(ForeignKey("unidad_medida.id"), nullable=False)
    activo: Mapped[bool] = mapped_column(default=True, nullable=False)

    unidad_medida: Mapped[UnidadMedida] = relationship("UnidadMedida")
