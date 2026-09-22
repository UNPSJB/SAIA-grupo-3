from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column
from src.models import ModeloBase

class Tarea(ModeloBase):
    __tablename__ = "tareas"

    id: Mapped[int] = mapped_column(primary_key=True, index=True, autoincrement=True)
    descripcion: Mapped[str] = mapped_column(String(250), nullable=False)