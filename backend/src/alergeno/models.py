from typing import Optional

from sqlalchemy import Column, ForeignKey, String, Table
from sqlalchemy.orm import Mapped, mapped_column

from src.models import ModeloBase

insumo_alergenos = Table(
    "insumo_alergenos",
    ModeloBase.metadata,
    Column("insumo_id", ForeignKey("insumos.id"), primary_key=True),
    Column("alergeno_id", ForeignKey("alergenos.id"), primary_key=True),
)


class Alergeno(ModeloBase):
    __tablename__ = "alergenos"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    nombre: Mapped[str] = mapped_column(String(60), unique=True, nullable=False)
    grupo: Mapped[str] = mapped_column(String(120), nullable=False)
    texto_declaracion: Mapped[str] = mapped_column(String(100), nullable=False)
    implica_gluten: Mapped[bool] = mapped_column(default=False, nullable=False)
    descripcion: Mapped[Optional[str]] = mapped_column(String(300), nullable=True)
    orden: Mapped[int] = mapped_column(default=0, nullable=False)
    activo: Mapped[bool] = mapped_column(default=True, nullable=False)
