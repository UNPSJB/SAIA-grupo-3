from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column
from src.models import ModeloBase

class Elemento(ModeloBase):
    __tablename__ = "elemento-limpieza"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    
    nombre: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    frecuencia_recambio: Mapped[int | None] = mapped_column(nullable=True)
    activo: Mapped[bool] = mapped_column(default=True, nullable=False)

