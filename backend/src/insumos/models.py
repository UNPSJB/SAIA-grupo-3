from sqlalchemy import ForeignKey, select, func
from sqlalchemy.ext.hybrid import hybrid_property
from sqlalchemy.orm import Mapped, mapped_column, relationship
from enum import auto, StrEnum
from src.models import ModeloBase
from src.unidadMedida.models import UnidadMedida
from src.insumos.constants import TipoInsumo
    

class Insumo(ModeloBase):
    __tablename__ = "insumos"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    nombre: Mapped[str] = mapped_column(nullable=False)
    stock_minimo: Mapped[float | None] = mapped_column(nullable=True, default=None)
    unidad_medida_id: Mapped[int] = mapped_column(ForeignKey("unidad_medida.id"), nullable=False)
    activo: Mapped[bool] = mapped_column(default=True, nullable=False)
    tipo: Mapped[TipoInsumo] = mapped_column(default=TipoInsumo.INGREDIENTE, nullable=False)
    aporta_energia_sodio: Mapped[bool] = mapped_column(default=False, nullable=False)
    es_azucar_anadido: Mapped[bool] = mapped_column(default=False, nullable=False)
    es_grasa_anadida: Mapped[bool] = mapped_column(default=False, nullable=False)
    aporta_sodio_anadido: Mapped[bool] = mapped_column(default=False, nullable=False)
    contiene_cafeina: Mapped[bool] = mapped_column(default=False, nullable=False)
    contiene_gluten: Mapped[bool] = mapped_column(default=False, nullable=False)
    denominacion_rotulo: Mapped[str | None] = mapped_column(nullable=True, default=None)
    densidad_g_ml: Mapped[float | None] = mapped_column(nullable=True, default=None)
    peso_unidad_g: Mapped[float | None] = mapped_column(nullable=True, default=None)
    aditivo_referencia_id: Mapped[int | None] = mapped_column(ForeignKey("aditivos_referencia.id"), nullable=True, default=None)

    aditivo_referencia = relationship("src.aditivoReferencia.models.AditivoReferencia", lazy="selectin")
    alergenos = relationship("src.alergeno.models.Alergeno", secondary="insumo_alergenos", lazy="selectin")
    unidadMedidaObj: Mapped[UnidadMedida] = relationship("UnidadMedida", back_populates="insumos")
    lotes_recepcion = relationship(
        "LoteRecepcionInsumo",
        back_populates="insumo",
        lazy="selectin",
    )

    @hybrid_property
    def cantidad(self) -> float:
        return sum(
            lote.cantidad_disponible
            for lote in self.lotes_recepcion
            if lote.activo
        )

    @cantidad.expression
    def cantidad(cls):
        # El filtro y el contador SQL deben calcular el mismo saldo que la vista.
        from src.abastecimiento.models import LoteRecepcionInsumo
        return (
            select(func.coalesce(func.sum(LoteRecepcionInsumo.cantidad_disponible), 0.0))
            .where(LoteRecepcionInsumo.insumo_id == cls.id,
                   LoteRecepcionInsumo.activo.is_(True))
            .correlate_except(LoteRecepcionInsumo)
            .scalar_subquery()
        )

    @property
    def alergeno_ids(self) -> list[int]:
        return sorted(alergeno.id for alergeno in self.alergenos)

    @property
    def stock_bajo(self) -> bool:
        return self.stock_minimo is not None and self.cantidad <= self.stock_minimo
