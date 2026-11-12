from dataclasses import dataclass
from datetime import datetime
from enum import StrEnum, auto
from typing import Optional

from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from src.insumos.models import Insumo
from src.receta.constants import EstadoVersionReceta
from src.receta.models import RenglonReceta, VersionReceta
from src.unidadMedida.models import TipoUnidadMedida, UnidadMedida


class EquivalenciaFaltante(StrEnum):
    FACTOR_UNIDAD = auto()
    DENSIDAD = auto()
    PESO_UNIDAD = auto()
    TIPO_UNIDAD = auto()


@dataclass
class ConversionAGramos:
    gramos: Optional[float]
    faltante: Optional[EquivalenciaFaltante] = None


def a_gramos(cantidad: float, unidad: UnidadMedida, insumo: Insumo) -> ConversionAGramos:
    if not unidad.factor_base:
        return ConversionAGramos(None, EquivalenciaFaltante.FACTOR_UNIDAD)
    en_base = cantidad * unidad.factor_base
    if unidad.tipo == TipoUnidadMedida.PESO:
        return ConversionAGramos(en_base)
    if unidad.tipo == TipoUnidadMedida.CAPACIDAD:
        if not insumo.densidad_g_ml:
            return ConversionAGramos(None, EquivalenciaFaltante.DENSIDAD)
        return ConversionAGramos(en_base * insumo.densidad_g_ml)
    if unidad.tipo == TipoUnidadMedida.UNIDAD:
        if not insumo.peso_unidad_g:
            return ConversionAGramos(None, EquivalenciaFaltante.PESO_UNIDAD)
        return ConversionAGramos(en_base * insumo.peso_unidad_g)
    return ConversionAGramos(None, EquivalenciaFaltante.TIPO_UNIDAD)


MENSAJES_FALTANTE = {
    EquivalenciaFaltante.FACTOR_UNIDAD: "La unidad '{unidad}' no tiene factor de conversión a su unidad base.",
    EquivalenciaFaltante.DENSIDAD: "'{insumo}' se usa en {unidad} y no tiene cargada su densidad (g por ml).",
    EquivalenciaFaltante.PESO_UNIDAD: "'{insumo}' se usa en {unidad} y no tiene cargado su peso por unidad (g).",
    EquivalenciaFaltante.TIPO_UNIDAD: "La unidad '{unidad}' no se puede convertir a gramos.",
}


def mensaje_faltante(faltante: EquivalenciaFaltante, insumo: Insumo, unidad: UnidadMedida) -> str:
    return MENSAJES_FALTANTE[faltante].format(insumo=insumo.nombre, unidad=unidad.sufijo)


def calcular_composicion(version: VersionReceta) -> None:
    conversiones = [a_gramos(renglon.cantidad, renglon.unidad_medida, renglon.insumo) for renglon in version.renglones]
    completa = all(conversion.gramos is not None for conversion in conversiones)
    total = sum(conversion.gramos for conversion in conversiones) if completa else None
    for renglon, conversion in zip(version.renglones, conversiones):
        renglon.gramos = conversion.gramos
        renglon.porcentaje = conversion.gramos * 100 / total if completa and total else None
    version.composicion_completa = completa and bool(total)
    version.composicion_total_gramos = total
    version.composicion_calculada_en = datetime.now()


def _recalcular(db: Session, condicion) -> int:
    versiones = db.scalars(
        select(VersionReceta)
        .join(RenglonReceta, RenglonReceta.version_id == VersionReceta.id)
        .where(
            condicion,
            or_(
                VersionReceta.estado == EstadoVersionReceta.VIGENTE,
                VersionReceta.composicion_completa.is_(False),
            ),
        )
        .distinct()
    ).all()
    for version in versiones:
        calcular_composicion(version)
    return len(versiones)


def recalcular_por_insumo(db: Session, insumo_id: int) -> int:
    return _recalcular(db, RenglonReceta.insumo_id == insumo_id)


def recalcular_por_unidad(db: Session, unidad_id: int) -> int:
    return _recalcular(db, RenglonReceta.unidad_medida_id == unidad_id)


def recalcular_todas(db: Session) -> int:
    versiones = db.scalars(select(VersionReceta)).all()
    for version in versiones:
        calcular_composicion(version)
    return len(versiones)
