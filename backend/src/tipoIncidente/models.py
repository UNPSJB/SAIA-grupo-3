from sqlalchemy.orm import Mapped, mapped_column
from src.models import ModeloBase


class TipoIncidente(ModeloBase):
    __tablename__ = "tipo_incidente"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    nombre: Mapped[str] = mapped_column(nullable=False, index=True)
    color: Mapped[str] = mapped_column(nullable=False)
    activo: Mapped[bool] = mapped_column(default=True, nullable=False)
