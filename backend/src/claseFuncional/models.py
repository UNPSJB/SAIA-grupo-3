from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column

from src.models import ModeloBase


class ClaseFuncional(ModeloBase):
    __tablename__ = "clases_funcionales"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    nombre: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    ins_opcional: Mapped[bool] = mapped_column(default=False, nullable=False)
    declarar_solo_funcion: Mapped[bool] = mapped_column(default=False, nullable=False)
    activo: Mapped[bool] = mapped_column(default=True, nullable=False)
