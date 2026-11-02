from datetime import date, datetime
from typing import Optional

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Date,
    DateTime,
    Float,
    ForeignKey,
    String,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.models import ModeloBase


class Proveedor(ModeloBase):
    __tablename__ = "proveedores"

    id: Mapped[int] = mapped_column(primary_key=True)
    nombre: Mapped[str] = mapped_column(String(150), index=True)
    cuit: Mapped[str] = mapped_column(String(11), unique=True, index=True)
    telefono: Mapped[Optional[str]] = mapped_column(String(40))
    email: Mapped[Optional[str]] = mapped_column(String(254))
    numero_habilitacion: Mapped[Optional[str]] = mapped_column(String(100))
    vencimiento_habilitacion: Mapped[Optional[date]] = mapped_column(Date)
    activo: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
    )


class LoteRecepcionInsumo(ModeloBase):
    __tablename__ = "lotes_recepcion_insumos"
    __table_args__ = (
        CheckConstraint("cantidad > 0", name="ck_recepcion_cantidad"),
        CheckConstraint(
            "cantidad_disponible >= 0",
            name="ck_recepcion_disponible",
        ),
        CheckConstraint(
            "cantidad_disponible <= cantidad",
            name="ck_recepcion_saldo_maximo",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    insumo_id: Mapped[int] = mapped_column(
        ForeignKey("insumos.id"),
        index=True,
    )
    proveedor_id: Mapped[int] = mapped_column(
        ForeignKey("proveedores.id"),
        index=True,
    )
    numero_lote: Mapped[str] = mapped_column(String(100), index=True)
    cantidad: Mapped[float] = mapped_column(Float)
    cantidad_disponible: Mapped[float] = mapped_column(Float)
    fecha_recepcion: Mapped[date] = mapped_column(Date, index=True)
    fecha_vencimiento: Mapped[date] = mapped_column(Date, index=True)
    registrado_por_id: Mapped[int] = mapped_column(
        ForeignKey("personal.id"),
    )
    fecha_registro: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.now,
    )
    activo: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
    )

    # True: identifica stock que ya existía y no debe sumarse nuevamente.
    conciliacion: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
    )

    # Permite reintentar una recepción sin duplicar su ingreso.
    clave_operacion: Mapped[str] = mapped_column(
        String(36),
        unique=True,
        nullable=False,
    )

    insumo = relationship("Insumo", back_populates="lotes_recepcion")
    proveedor = relationship("Proveedor")


class ConsumoLoteRecepcion(ModeloBase):
    __tablename__ = "consumos_lotes_recepcion"
    __table_args__ = (
        UniqueConstraint(
            "lote_produccion_id",
            "lote_recepcion_id",
            name="uq_consumo_produccion_recepcion",
        ),
        CheckConstraint("cantidad > 0", name="ck_consumo_recepcion_cantidad"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    lote_produccion_id: Mapped[int] = mapped_column(
        ForeignKey("lotes_produccion.id"),
        index=True,
    )
    lote_recepcion_id: Mapped[int] = mapped_column(
        ForeignKey("lotes_recepcion_insumos.id"),
        index=True,
    )
    cantidad: Mapped[float] = mapped_column(Float)


class ConsumoStockAnterior(ModeloBase):
    """Historial previo a la trazabilidad obligatoria; no admite nuevos consumos."""

    __tablename__ = "consumos_stock_anterior"
    __table_args__ = (
        UniqueConstraint(
            "lote_produccion_id", "insumo_id",
            name="uq_consumo_stock_anterior",
        ),
        CheckConstraint("cantidad > 0", name="ck_consumo_stock_anterior_cantidad"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    lote_produccion_id: Mapped[int] = mapped_column(
        ForeignKey("lotes_produccion.id"), index=True,
    )
    insumo_id: Mapped[int] = mapped_column(ForeignKey("insumos.id"), index=True)
    cantidad: Mapped[float] = mapped_column(Float)
