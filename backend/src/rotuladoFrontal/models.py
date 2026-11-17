from datetime import date, datetime
from typing import Optional

from sqlalchemy import JSON, Date, DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.models import ModeloBase
from src.rotuladoFrontal.constants import TipoProducto
from src.nutricion.constants import Nutriente
from src.rotuladoFrontal.constants import (
    AplicaA,
    Comparacion,
    EstadoConjunto,
    Formula,
    Hecho,
    OperadorRegla,
    ResultadoAplicabilidad,
    Sello,
)


class ConjuntoParametros(ModeloBase):
    __tablename__ = "conjuntos_parametros_rotulado"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    numero: Mapped[int] = mapped_column(unique=True, nullable=False)
    estado: Mapped[EstadoConjunto] = mapped_column(default=EstadoConjunto.BORRADOR, nullable=False)
    nombre: Mapped[str] = mapped_column(String(150), nullable=False)
    norma_origen: Mapped[str] = mapped_column(String(500), nullable=False)
    fecha_vigencia: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    motivo: Mapped[str] = mapped_column(String(500), nullable=False)
    version_base_id: Mapped[Optional[int]] = mapped_column(ForeignKey("conjuntos_parametros_rotulado.id"), nullable=True)
    creado_por_id: Mapped[Optional[int]] = mapped_column(ForeignKey("personal.id"), nullable=True)
    creado_en: Mapped[datetime] = mapped_column(DateTime, default=datetime.now, nullable=False)
    publicado_por_id: Mapped[Optional[int]] = mapped_column(ForeignKey("personal.id"), nullable=True)
    publicado_en: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    archivado_en: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    creado_por = relationship("src.personal.models.Personal", foreign_keys=[creado_por_id])
    publicado_por = relationship("src.personal.models.Personal", foreign_keys=[publicado_por_id])
    version_base = relationship("ConjuntoParametros", remote_side=[id])
    umbrales: Mapped[list["UmbralSello"]] = relationship(
        order_by="UmbralSello.orden", cascade="all, delete-orphan"
    )
    reglas: Mapped[list["ReglaAplicabilidad"]] = relationship(
        order_by="ReglaAplicabilidad.orden", cascade="all, delete-orphan"
    )
    advertencias: Mapped[list["AdvertenciaPrecautoria"]] = relationship(
        order_by="AdvertenciaPrecautoria.orden", cascade="all, delete-orphan"
    )


class UmbralSello(ModeloBase):
    __tablename__ = "umbrales_sello_rotulado"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    conjunto_id: Mapped[int] = mapped_column(ForeignKey("conjuntos_parametros_rotulado.id"), nullable=False, index=True)
    orden: Mapped[int] = mapped_column(nullable=False)
    sello: Mapped[Sello] = mapped_column(nullable=False)
    leyenda: Mapped[str] = mapped_column(String(60), nullable=False)
    nutriente: Mapped[Nutriente] = mapped_column(nullable=False)
    formula: Mapped[Formula] = mapped_column(nullable=False)
    factor_energetico: Mapped[Optional[float]] = mapped_column(nullable=True)
    limite: Mapped[float] = mapped_column(nullable=False)
    unidad: Mapped[str] = mapped_column(String(30), nullable=False)
    comparacion: Mapped[Comparacion] = mapped_column(nullable=False)
    aplica_a: Mapped[AplicaA] = mapped_column(nullable=False)
    requiere_agregado: Mapped[Optional[Hecho]] = mapped_column(nullable=True)
    requiere_alguno_de: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    energia_maxima_porcion: Mapped[Optional[float]] = mapped_column(nullable=True)
    nota: Mapped[Optional[str]] = mapped_column(String(300), nullable=True)


class ReglaAplicabilidad(ModeloBase):
    __tablename__ = "reglas_aplicabilidad_rotulado"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    conjunto_id: Mapped[int] = mapped_column(ForeignKey("conjuntos_parametros_rotulado.id"), nullable=False, index=True)
    orden: Mapped[int] = mapped_column(nullable=False)
    operador: Mapped[OperadorRegla] = mapped_column(nullable=False)
    hechos: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    resultado: Mapped[ResultadoAplicabilidad] = mapped_column(nullable=False)
    mensaje: Mapped[str] = mapped_column(String(300), nullable=False)


class AdvertenciaPrecautoria(ModeloBase):
    __tablename__ = "advertencias_precautorias_rotulado"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    conjunto_id: Mapped[int] = mapped_column(ForeignKey("conjuntos_parametros_rotulado.id"), nullable=False, index=True)
    orden: Mapped[int] = mapped_column(nullable=False)
    hecho: Mapped[Hecho] = mapped_column(nullable=False)
    texto: Mapped[str] = mapped_column(String(150), nullable=False)


class AplicabilidadProducto(ModeloBase):
    __tablename__ = "aplicabilidad_rotulado_producto"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    producto_id: Mapped[int] = mapped_column(ForeignKey("productos.id"), unique=True, nullable=False, index=True)
    envasado_ausencia_cliente: Mapped[Optional[bool]] = mapped_column(nullable=True)
    tipo_producto: Mapped[TipoProducto] = mapped_column(default=TipoProducto.SOLIDO, nullable=False)
    correcciones: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    sugeridos: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    hechos: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    version_receta_id: Mapped[Optional[int]] = mapped_column(ForeignKey("versiones_receta.id"), nullable=True)
    resultado: Mapped[Optional[ResultadoAplicabilidad]] = mapped_column(nullable=True)
    mensaje: Mapped[Optional[str]] = mapped_column(String(300), nullable=True)
    regla_orden: Mapped[Optional[int]] = mapped_column(nullable=True)
    conjunto_id: Mapped[Optional[int]] = mapped_column(ForeignKey("conjuntos_parametros_rotulado.id"), nullable=True)
    evaluado_por_id: Mapped[Optional[int]] = mapped_column(ForeignKey("personal.id"), nullable=True)
    evaluado_en: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    producto = relationship("src.producto.models.Producto")
    conjunto = relationship("ConjuntoParametros")
    version_receta = relationship("src.receta.models.VersionReceta")
    evaluado_por = relationship("src.personal.models.Personal")


class CorreccionAgregado(ModeloBase):
    __tablename__ = "correcciones_agregado_rotulado"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    producto_id: Mapped[int] = mapped_column(ForeignKey("productos.id"), nullable=False, index=True)
    hecho: Mapped[Hecho] = mapped_column(nullable=False)
    valor_sugerido: Mapped[bool] = mapped_column(nullable=False)
    valor_anterior: Mapped[Optional[bool]] = mapped_column(nullable=True)
    valor_nuevo: Mapped[Optional[bool]] = mapped_column(nullable=True)
    motivo: Mapped[Optional[str]] = mapped_column(String(300), nullable=True)
    personal_id: Mapped[int] = mapped_column(ForeignKey("personal.id"), nullable=False)
    fecha_hora: Mapped[datetime] = mapped_column(DateTime, nullable=False)

    personal = relationship("src.personal.models.Personal")
<<<<<<< HEAD


class CalculoSellos(ModeloBase):
    __tablename__ = "calculos_sellos_rotulado"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    producto_id: Mapped[int] = mapped_column(ForeignKey("productos.id"), nullable=False, index=True)
    version_receta_id: Mapped[int] = mapped_column(ForeignKey("versiones_receta.id"), nullable=False)
    conjunto_id: Mapped[int] = mapped_column(ForeignKey("conjuntos_parametros_rotulado.id"), nullable=False)
    tipo_producto: Mapped[TipoProducto] = mapped_column(nullable=False)
    base: Mapped[Optional[str]] = mapped_column(String(5), nullable=True)
    provisorio: Mapped[bool] = mapped_column(default=False, nullable=False)
    faltantes: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    entrada: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    hechos: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    sellos: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    leyendas: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    advertencias: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    detalle: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    calculado_por_id: Mapped[int] = mapped_column(ForeignKey("personal.id"), nullable=False)
    calculado_en: Mapped[datetime] = mapped_column(DateTime, nullable=False)

    conjunto = relationship("ConjuntoParametros")
    version_receta = relationship("src.receta.models.VersionReceta")
    calculado_por = relationship("src.personal.models.Personal")
=======
>>>>>>> dev
