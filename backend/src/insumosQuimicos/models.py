from enum import StrEnum, auto
from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from src.models import ModeloBase
from src.unidadMedida.models import UnidadMedida


class TipoQuimico(StrEnum):
    DETERGENTE = auto()
    DESINFECTANTE = auto()
    DESENGRASANTE = auto()


class InsumoQuimico(ModeloBase):
    __tablename__ = "insumos_quimicos"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    nombre: Mapped[str] = mapped_column(String(120), unique=True, index=True, nullable=False)
    cantidad: Mapped[float] = mapped_column(default=0.0, nullable=False)
    tipo_quimico: Mapped[TipoQuimico] = mapped_column(nullable=False)
    activo: Mapped[bool] = mapped_column(default=True, nullable=False)

    unidad_medida_id: Mapped[int] = mapped_column(ForeignKey("unidad_medida.id"), nullable=False)
    unidadMedidaObj: Mapped[UnidadMedida] = relationship("UnidadMedida")