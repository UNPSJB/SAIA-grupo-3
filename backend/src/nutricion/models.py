from datetime import datetime
from typing import Optional

from sqlalchemy import JSON, DateTime, ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.models import ModeloBase
from src.nutricion.constants import AccionHistorial, BaseCalculo, FuenteNutricional, Nutriente


class AlimentoReferencia(ModeloBase):
    __tablename__ = "alimentos_referencia"
    __table_args__ = (UniqueConstraint("fuente", "codigo", name="uq_alimento_fuente_codigo"),)

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    fuente: Mapped[str] = mapped_column(String(60), nullable=False, index=True)
    codigo: Mapped[str] = mapped_column(String(40), nullable=False)
    nombre: Mapped[str] = mapped_column(String(200), nullable=False, index=True)
    grupo: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    energia_kcal: Mapped[Optional[float]] = mapped_column(nullable=True)
    carbohidratos_g: Mapped[Optional[float]] = mapped_column(nullable=True)
    azucares_totales_g: Mapped[Optional[float]] = mapped_column(nullable=True)
    azucares_anadidos_g: Mapped[Optional[float]] = mapped_column(nullable=True)
    proteinas_g: Mapped[Optional[float]] = mapped_column(nullable=True)
    grasas_totales_g: Mapped[Optional[float]] = mapped_column(nullable=True)
    grasas_saturadas_g: Mapped[Optional[float]] = mapped_column(nullable=True)
    grasas_trans_g: Mapped[Optional[float]] = mapped_column(nullable=True)
    fibra_g: Mapped[Optional[float]] = mapped_column(nullable=True)
    sodio_mg: Mapped[Optional[float]] = mapped_column(nullable=True)
    importado_en: Mapped[datetime] = mapped_column(DateTime, default=datetime.now, nullable=False)


class ValorNutricionalInsumo(ModeloBase):
    __tablename__ = "valores_nutricionales_insumo"
    __table_args__ = (UniqueConstraint("insumo_id", "nutriente", name="uq_valor_nutricional_insumo"),)

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    insumo_id: Mapped[int] = mapped_column(ForeignKey("insumos.id"), nullable=False, index=True)
    nutriente: Mapped[Nutriente] = mapped_column(nullable=False)
    valor: Mapped[float] = mapped_column(nullable=False)
    fuente: Mapped[FuenteNutricional] = mapped_column(nullable=False)
    detalle_fuente: Mapped[Optional[str]] = mapped_column(String(250), nullable=True)
    alimento_referencia_id: Mapped[Optional[int]] = mapped_column(ForeignKey("alimentos_referencia.id"), nullable=True)
    valor_fuente: Mapped[float] = mapped_column(nullable=False)
    cargado_por_id: Mapped[int] = mapped_column(ForeignKey("personal.id"), nullable=False)
    cargado_en: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    modificado: Mapped[bool] = mapped_column(default=False, nullable=False)
    modificado_por_id: Mapped[Optional[int]] = mapped_column(ForeignKey("personal.id"), nullable=True)
    modificado_en: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    alimento_referencia = relationship("AlimentoReferencia")
    cargado_por = relationship("src.personal.models.Personal", foreign_keys=[cargado_por_id])
    modificado_por = relationship("src.personal.models.Personal", foreign_keys=[modificado_por_id])


class HistorialValorNutricional(ModeloBase):
    __tablename__ = "historial_valores_nutricionales"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    insumo_id: Mapped[int] = mapped_column(ForeignKey("insumos.id"), nullable=False, index=True)
    nutriente: Mapped[Nutriente] = mapped_column(nullable=False)
    accion: Mapped[AccionHistorial] = mapped_column(nullable=False)
    valor_anterior: Mapped[Optional[float]] = mapped_column(nullable=True)
    valor_nuevo: Mapped[Optional[float]] = mapped_column(nullable=True)
    fuente: Mapped[Optional[FuenteNutricional]] = mapped_column(nullable=True)
    detalle_fuente: Mapped[Optional[str]] = mapped_column(String(250), nullable=True)
    alimento_referencia_id: Mapped[Optional[int]] = mapped_column(ForeignKey("alimentos_referencia.id"), nullable=True)
    personal_id: Mapped[int] = mapped_column(ForeignKey("personal.id"), nullable=False)
    fecha_hora: Mapped[datetime] = mapped_column(DateTime, nullable=False)

    alimento_referencia = relationship("AlimentoReferencia")
    personal = relationship("src.personal.models.Personal")


class ValorDiarioReferencia(ModeloBase):
    __tablename__ = "valores_diarios_referencia"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    nutriente: Mapped[Nutriente] = mapped_column(unique=True, nullable=False)
    valor: Mapped[Optional[float]] = mapped_column(nullable=True)


class ReglaExpresionNutriente(ModeloBase):
    __tablename__ = "reglas_expresion_nutriente"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    nutriente: Mapped[Nutriente] = mapped_column(unique=True, nullable=False)
    unidad: Mapped[str] = mapped_column(String(10), nullable=False)
    decimales: Mapped[int] = mapped_column(nullable=False)
    entero_desde: Mapped[Optional[float]] = mapped_column(nullable=True)
    umbral_no_significativo: Mapped[Optional[float]] = mapped_column(nullable=True)


class ConfiguracionNutricional(ModeloBase):
    __tablename__ = "configuracion_nutricional"

    id: Mapped[int] = mapped_column(primary_key=True)
    expresion_no_significativo: Mapped[str] = mapped_column(String(40), nullable=False)
    decimales_vd: Mapped[int] = mapped_column(nullable=False)
    leyenda_vd: Mapped[str] = mapped_column(String(250), nullable=False)
    modificado_por_id: Mapped[Optional[int]] = mapped_column(ForeignKey("personal.id"), nullable=True)
    modificado_en: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    modificado_por = relationship("src.personal.models.Personal")


class InformacionNutricionalVersion(ModeloBase):
    __tablename__ = "informacion_nutricional_version"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    version_id: Mapped[int] = mapped_column(ForeignKey("versiones_receta.id"), unique=True, nullable=False, index=True)
    completa: Mapped[bool] = mapped_column(default=False, nullable=False)
    base: Mapped[Optional[BaseCalculo]] = mapped_column(nullable=True)
    rendimiento_base: Mapped[Optional[float]] = mapped_column(nullable=True)
    porcion_base: Mapped[Optional[float]] = mapped_column(nullable=True)
    faltantes: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    calculada_en: Mapped[datetime] = mapped_column(DateTime, nullable=False)

    valores: Mapped[list["ValorNutricionalVersion"]] = relationship(
        cascade="all, delete-orphan", order_by="ValorNutricionalVersion.id"
    )


class ValorNutricionalVersion(ModeloBase):
    __tablename__ = "valores_nutricionales_version"
    __table_args__ = (UniqueConstraint("informacion_id", "nutriente", name="uq_valor_nutricional_version"),)

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    informacion_id: Mapped[int] = mapped_column(
        ForeignKey("informacion_nutricional_version.id"), nullable=False, index=True
    )
    nutriente: Mapped[Nutriente] = mapped_column(nullable=False)
    total_receta: Mapped[Optional[float]] = mapped_column(nullable=True)
    por_100: Mapped[Optional[float]] = mapped_column(nullable=True)
    por_porcion: Mapped[Optional[float]] = mapped_column(nullable=True)
