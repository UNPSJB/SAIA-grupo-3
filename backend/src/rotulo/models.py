from datetime import datetime
from typing import Optional

from sqlalchemy import JSON, DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.models import ModeloBase
from src.rotulo.constants import (
    LEYENDA_DURACION_INICIAL,
    PAIS_ORIGEN_INICIAL,
    CampoAutomatico,
    CondicionConservacion,
    EstadoDeclaracion,
    TipoRegistro,
    UnidadVidaUtil,
)


class BorradorRotulo(ModeloBase):
    __tablename__ = "borradores_rotulo"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    producto_id: Mapped[int] = mapped_column(ForeignKey("productos.id"), unique=True, nullable=False, index=True)
    denominacion_venta: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    lista_ingredientes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    identificacion_lote: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    contenido_neto: Mapped[Optional[float]] = mapped_column(nullable=True)
    contenido_neto_unidad_id: Mapped[Optional[int]] = mapped_column(ForeignKey("unidad_medida.id"), nullable=True)
    razon_social: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    domicilio: Mapped[Optional[str]] = mapped_column(String(300), nullable=True)
    pais_origen: Mapped[Optional[str]] = mapped_column(String(100), default=PAIS_ORIGEN_INICIAL, nullable=True)
    tipo_registro: Mapped[Optional[TipoRegistro]] = mapped_column(nullable=True)
    numero_registro: Mapped[Optional[str]] = mapped_column(String(60), nullable=True)
    numero_establecimiento: Mapped[Optional[str]] = mapped_column(String(60), nullable=True)
    es_importado: Mapped[bool] = mapped_column(default=False, nullable=False)
    importador_razon_social: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    importador_domicilio: Mapped[Optional[str]] = mapped_column(String(300), nullable=True)
    vida_util_cantidad: Mapped[Optional[int]] = mapped_column(nullable=True)
    vida_util_unidad: Mapped[UnidadVidaUtil] = mapped_column(default=UnidadVidaUtil.DIAS, nullable=False)
    leyenda_duracion: Mapped[str] = mapped_column(String(150), default=LEYENDA_DURACION_INICIAL, nullable=False)
    requiere_instrucciones: Mapped[bool] = mapped_column(default=False, nullable=False)
    instrucciones: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    automaticos: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    puede_contener_ids: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    conservacion_condicion: Mapped[Optional[CondicionConservacion]] = mapped_column(nullable=True)
    conservacion_temp_min: Mapped[Optional[float]] = mapped_column(nullable=True)
    conservacion_temp_max: Mapped[Optional[float]] = mapped_column(nullable=True)
    conservacion_duracion_cantidad: Mapped[Optional[int]] = mapped_column(nullable=True)
    conservacion_duracion_unidad: Mapped[UnidadVidaUtil] = mapped_column(default=UnidadVidaUtil.DIAS, nullable=False)
    conservacion_abierto: Mapped[Optional[str]] = mapped_column(String(300), nullable=True)
    alergenos_estado: Mapped[EstadoDeclaracion] = mapped_column(default=EstadoDeclaracion.SUGERIDA, nullable=False)
    alergenos_confirmado_por_id: Mapped[Optional[int]] = mapped_column(ForeignKey("personal.id"), nullable=True)
    alergenos_confirmado_en: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    alergenos_version_receta_id: Mapped[Optional[int]] = mapped_column(nullable=True)
    alergenos_confirmacion: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    alergenos_aviso: Mapped[Optional[str]] = mapped_column(String(300), nullable=True)
    creado_por_id: Mapped[int] = mapped_column(ForeignKey("personal.id"), nullable=False)
    creado_en: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    actualizado_por_id: Mapped[int] = mapped_column(ForeignKey("personal.id"), nullable=False)
    actualizado_en: Mapped[datetime] = mapped_column(DateTime, nullable=False)

    producto = relationship("src.producto.models.Producto")
    contenido_neto_unidad = relationship("src.unidadMedida.models.UnidadMedida")
    creado_por = relationship("src.personal.models.Personal", foreign_keys=[creado_por_id])
    actualizado_por = relationship("src.personal.models.Personal", foreign_keys=[actualizado_por_id])
    alergenos_confirmado_por = relationship("src.personal.models.Personal", foreign_keys=[alergenos_confirmado_por_id])
    ediciones: Mapped[list["EdicionCampoRotulo"]] = relationship(
        order_by="EdicionCampoRotulo.id.desc()", cascade="all, delete-orphan"
    )


class EdicionCampoRotulo(ModeloBase):
    __tablename__ = "ediciones_campo_rotulo"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    borrador_id: Mapped[int] = mapped_column(ForeignKey("borradores_rotulo.id"), nullable=False, index=True)
    campo: Mapped[CampoAutomatico] = mapped_column(nullable=False)
    origen: Mapped[str] = mapped_column(String(150), nullable=False)
    valor_sistema: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    valor_original: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    valor_nuevo: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    personal_id: Mapped[int] = mapped_column(ForeignKey("personal.id"), nullable=False)
    fecha_hora: Mapped[datetime] = mapped_column(DateTime, nullable=False)

    personal = relationship("src.personal.models.Personal")


class ExportacionRotulo(ModeloBase):
    __tablename__ = "exportaciones_rotulo"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    producto_id: Mapped[int] = mapped_column(ForeignKey("productos.id"), nullable=False, index=True)
    borrador_id: Mapped[int] = mapped_column(ForeignKey("borradores_rotulo.id"), nullable=False)
    numero: Mapped[int] = mapped_column(nullable=False)
    version_receta_id: Mapped[int] = mapped_column(ForeignKey("versiones_receta.id"), nullable=False)
    version_receta_numero: Mapped[int] = mapped_column(nullable=False)
    conjunto_parametros_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("conjuntos_parametros_rotulado.id"), nullable=True
    )
    conjunto_parametros_numero: Mapped[Optional[int]] = mapped_column(nullable=True)
    calculo_sellos_id: Mapped[Optional[int]] = mapped_column(ForeignKey("calculos_sellos_rotulado.id"), nullable=True)
    lista_para_revision: Mapped[bool] = mapped_column(default=False, nullable=False)
    faltantes: Mapped[int] = mapped_column(default=0, nullable=False)
    contenido: Mapped[dict] = mapped_column(JSON, nullable=False)
    generado_por_id: Mapped[int] = mapped_column(ForeignKey("personal.id"), nullable=False)
    generado_en: Mapped[datetime] = mapped_column(DateTime, nullable=False)

    producto = relationship("src.producto.models.Producto")
    generado_por = relationship("src.personal.models.Personal")
