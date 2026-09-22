from sqlalchemy import String, Date
from sqlalchemy.orm import Mapped, mapped_column
from datetime import date
from src.models import ModeloBase

class Elemento(ModeloBase):

    __tablename__ = "elemento-limpieza"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    
    nombre: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    frecuencia_recambio: Mapped[int | None] = mapped_column(nullable=True)
    
    fecha_ultimo_recambio: Mapped[date | None] = mapped_column(Date, nullable=True)
    fecha_proximo_recambio: Mapped[date | None] = mapped_column(Date, nullable=True)
    
    activo: Mapped[bool] = mapped_column(default=True, nullable=False)