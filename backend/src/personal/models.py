from typing import TYPE_CHECKING
from sqlalchemy import String, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from src.models import ModeloBase

if TYPE_CHECKING:
    from src.documentacion.models import Documentacion

class Personal(ModeloBase):
    __tablename__ = "personal"

    id: Mapped[int] = mapped_column(primary_key=True, index=True, autoincrement=True)
    nombre: Mapped[str] = mapped_column(String(50), nullable=False)
    apellido: Mapped[str] = mapped_column(String(50), nullable=False)
    dni: Mapped[str] = mapped_column(String(20), unique=True, index=True, nullable=False)
    nroLegajo: Mapped[str] = mapped_column(String(20), unique=True, index=True, nullable=False)
    email: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    
    username: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    
    operar: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    administrar: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    activo: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    documentos: Mapped[list["Documentacion"]] = relationship("Documentacion", back_populates="personal")

    @property
    def capacidades(self) -> set[str]:
        capacidades = set()
        if self.operar:
            capacidades.add("operar")
        if self.administrar:
            capacidades.add("administrar")
        return capacidades

    @property
    def is_admin(self) -> bool:
        return bool(self.administrar)

    @property
    def role_name(self) -> str:
        return "admin" if self.administrar else "operario"

    @property
    def role_id(self) -> int:
        return 1 if self.administrar else 2