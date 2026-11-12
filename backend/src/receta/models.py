from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.insumos.constants import TipoInsumo
from src.models import ModeloBase
from src.receta.constants import EstadoVersionReceta


class Receta(ModeloBase):
    __tablename__ = "recetas"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    producto_id: Mapped[int] = mapped_column(ForeignKey("productos.id"), unique=True, nullable=False, index=True)
    fecha_creacion: Mapped[datetime] = mapped_column(DateTime, default=datetime.now, nullable=False)

    producto = relationship("src.producto.models.Producto")
    versiones: Mapped[list["VersionReceta"]] = relationship(
        back_populates="receta", order_by="VersionReceta.numero.desc()"
    )

    @property
    def cantidad_versiones(self) -> int:
        return len(self.versiones)

    @property
    def version_vigente(self) -> Optional["VersionReceta"]:
        return next((version for version in self.versiones if version.estado == EstadoVersionReceta.VIGENTE), None)


class VersionReceta(ModeloBase):
    __tablename__ = "versiones_receta"
    __table_args__ = (UniqueConstraint("receta_id", "numero", name="uq_version_receta_numero"),)

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    receta_id: Mapped[int] = mapped_column(ForeignKey("recetas.id"), nullable=False, index=True)
    numero: Mapped[int] = mapped_column(nullable=False)
    estado: Mapped[EstadoVersionReceta] = mapped_column(default=EstadoVersionReceta.VIGENTE, nullable=False)
    motivo: Mapped[str] = mapped_column(String(500), nullable=False)

    rendimiento_cantidad: Mapped[float] = mapped_column(nullable=False)
    rendimiento_unidad_id: Mapped[int] = mapped_column(ForeignKey("unidad_medida.id"), nullable=False)
    porcion_cantidad: Mapped[Optional[float]] = mapped_column(nullable=True)
    porcion_unidad_id: Mapped[Optional[int]] = mapped_column(ForeignKey("unidad_medida.id"), nullable=True)
    porcion_medida_casera: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    creado_por_id: Mapped[int] = mapped_column(ForeignKey("personal.id"), nullable=False)
    fecha_creacion: Mapped[datetime] = mapped_column(DateTime, default=datetime.now, nullable=False)

    receta: Mapped[Receta] = relationship(back_populates="versiones")
    rendimiento_unidad = relationship("src.unidadMedida.models.UnidadMedida", foreign_keys=[rendimiento_unidad_id])
    porcion_unidad = relationship("src.unidadMedida.models.UnidadMedida", foreign_keys=[porcion_unidad_id])
    creado_por = relationship("src.personal.models.Personal")
    renglones: Mapped[list["RenglonReceta"]] = relationship(
        order_by="RenglonReceta.orden", cascade="all, delete-orphan"
    )
    pasos: Mapped[list["PasoReceta"]] = relationship(order_by="PasoReceta.orden", cascade="all, delete-orphan")


class RenglonReceta(ModeloBase):
    __tablename__ = "renglones_receta"
    __table_args__ = (UniqueConstraint("version_id", "insumo_id", name="uq_renglon_receta_insumo"),)

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    version_id: Mapped[int] = mapped_column(ForeignKey("versiones_receta.id"), nullable=False, index=True)
    orden: Mapped[int] = mapped_column(nullable=False)
    insumo_id: Mapped[int] = mapped_column(ForeignKey("insumos.id"), nullable=False, index=True)
    tipo: Mapped[TipoInsumo] = mapped_column(nullable=False)
    aditivo_referencia_id: Mapped[Optional[int]] = mapped_column(ForeignKey("aditivos_referencia.id"), nullable=True)
    cantidad: Mapped[float] = mapped_column(nullable=False)
    unidad_medida_id: Mapped[int] = mapped_column(ForeignKey("unidad_medida.id"), nullable=False)

    insumo = relationship("src.insumos.models.Insumo")
    aditivo_referencia = relationship("src.aditivoReferencia.models.AditivoReferencia")
    unidad_medida = relationship("src.unidadMedida.models.UnidadMedida")


class PasoReceta(ModeloBase):
    __tablename__ = "pasos_receta"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    version_id: Mapped[int] = mapped_column(ForeignKey("versiones_receta.id"), nullable=False, index=True)
    orden: Mapped[int] = mapped_column(nullable=False)
    nombre: Mapped[str] = mapped_column(String(150), nullable=False)
    procedimiento: Mapped[str] = mapped_column(String(2000), nullable=False)
    equipo_id: Mapped[Optional[int]] = mapped_column(ForeignKey("equipos.id"), nullable=True)
    tiempo_minutos: Mapped[Optional[int]] = mapped_column(nullable=True)
    temperatura_celsius: Mapped[Optional[float]] = mapped_column(nullable=True)
    punto_control: Mapped[bool] = mapped_column(default=False, nullable=False)

    equipo = relationship("src.equipos.models.Equipo")
