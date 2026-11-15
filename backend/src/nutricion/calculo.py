from datetime import datetime
from typing import Optional

from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from src.insumos.constants import TipoInsumo
from src.nutricion.constants import NUTRIENTES, NUTRIENTES_DE_ADITIVO, BaseCalculo, Faltante, Nutriente
from src.nutricion.models import InformacionNutricionalVersion, ValorNutricionalInsumo, ValorNutricionalVersion
from src.receta.constants import EstadoVersionReceta
from src.receta.models import RenglonReceta, VersionReceta
from src.unidadMedida.models import TipoUnidadMedida, UnidadMedida

BASE_POR_TIPO = {TipoUnidadMedida.PESO: BaseCalculo.GRAMOS, TipoUnidadMedida.CAPACIDAD: BaseCalculo.MILILITROS}


def _rendimiento(version: VersionReceta) -> tuple[Optional[BaseCalculo], Optional[float], Optional[str]]:
    unidad: UnidadMedida = version.rendimiento_unidad
    if unidad.tipo == TipoUnidadMedida.UNIDAD:
        if not version.rendimiento_peso_g:
            return None, None, Faltante.RENDIMIENTO_EN_UNIDADES.format(unidad=unidad.sufijo)
        return BaseCalculo.GRAMOS, version.rendimiento_peso_g, None
    if unidad.tipo not in BASE_POR_TIPO:
        return None, None, Faltante.RENDIMIENTO_NO_MEDIBLE.format(unidad=unidad.sufijo)
    if not unidad.factor_base:
        return None, None, Faltante.RENDIMIENTO_SIN_FACTOR.format(unidad=unidad.sufijo)
    return BASE_POR_TIPO[unidad.tipo], version.rendimiento_cantidad * unidad.factor_base, None


def _porcion(version: VersionReceta, base: BaseCalculo, rendimiento_base: float) -> tuple[Optional[float], Optional[str]]:
    unidad: Optional[UnidadMedida] = version.porcion_unidad
    if version.porcion_cantidad is None or unidad is None:
        return None, None
    incompatible = Faltante.PORCION_INCOMPATIBLE.format(unidad=unidad.sufijo, base=base.value)
    if not unidad.factor_base:
        return None, incompatible
    cantidad = version.porcion_cantidad * unidad.factor_base
    if BASE_POR_TIPO.get(unidad.tipo) == base:
        return cantidad, None
    rendimiento = version.rendimiento_unidad
    if unidad.tipo == TipoUnidadMedida.UNIDAD and rendimiento.tipo == TipoUnidadMedida.UNIDAD and rendimiento.factor_base:
        return cantidad * rendimiento_base / (version.rendimiento_cantidad * rendimiento.factor_base), None
    return None, incompatible


def _cuenta(renglon: RenglonReceta, nutriente: Nutriente) -> bool:
    if renglon.tipo == TipoInsumo.INGREDIENTE:
        return True
    return renglon.insumo.aporta_energia_sodio and nutriente in NUTRIENTES_DE_ADITIVO


def _valores_por_insumo(db: Session, insumo_ids: set[int]) -> dict[int, dict[Nutriente, float]]:
    resultado: dict[int, dict[Nutriente, float]] = {insumo_id: {} for insumo_id in insumo_ids}
    filas = db.scalars(select(ValorNutricionalInsumo).where(ValorNutricionalInsumo.insumo_id.in_(insumo_ids))).all()
    for fila in filas:
        resultado[fila.insumo_id][fila.nutriente] = fila.valor
    return resultado


def calcular_informacion(db: Session, version: VersionReceta) -> InformacionNutricionalVersion:
    db.flush()
    faltantes: list[str] = []
    if not version.composicion_completa:
        faltantes.append(Faltante.COMPOSICION)
    base, rendimiento_base, problema = _rendimiento(version)
    if problema:
        faltantes.append(problema)
    porcion_base = None
    if base is not None:
        porcion_base, problema = _porcion(version, base, rendimiento_base)
        if problema:
            faltantes.append(problema)

    valores = _valores_por_insumo(db, {renglon.insumo_id for renglon in version.renglones})
    sin_datos: dict[int, list[Nutriente]] = {}
    totales: dict[Nutriente, Optional[float]] = {}
    for nutriente in NUTRIENTES:
        total = 0.0
        for renglon in version.renglones:
            if not _cuenta(renglon, nutriente):
                continue
            valor = valores[renglon.insumo_id].get(nutriente)
            if valor is None:
                sin_datos.setdefault(renglon.insumo_id, []).append(nutriente)
                total = None
            elif total is not None and renglon.gramos is not None:
                total += renglon.gramos * valor / 100
            else:
                total = None
        totales[nutriente] = total
    for renglon in version.renglones:
        if renglon.insumo_id in sin_datos:
            nombres = ", ".join(NUTRIENTES[n][0].lower() for n in sin_datos[renglon.insumo_id])
            faltantes.append(Faltante.INSUMO_SIN_DATOS.format(insumo=renglon.insumo.nombre, nutrientes=nombres))

    informacion = db.scalar(
        select(InformacionNutricionalVersion).where(InformacionNutricionalVersion.version_id == version.id)
    )
    if informacion is None:
        informacion = InformacionNutricionalVersion(version_id=version.id)
        db.add(informacion)
    informacion.completa = not faltantes
    informacion.base = base
    informacion.rendimiento_base = rendimiento_base
    informacion.porcion_base = porcion_base
    informacion.faltantes = faltantes
    informacion.calculada_en = datetime.now()
    filas = []
    for nutriente, total in totales.items():
        por_100 = total * 100 / rendimiento_base if total is not None and rendimiento_base else None
        por_porcion = por_100 * porcion_base / 100 if por_100 is not None and porcion_base else None
        filas.append(
            ValorNutricionalVersion(nutriente=nutriente, total_receta=total, por_100=por_100, por_porcion=por_porcion)
        )
    informacion.valores.clear()
    db.flush()
    informacion.valores.extend(filas)
    db.flush()
    return informacion


def recalcular_por_insumo(db: Session, insumo_id: int) -> int:
    db.flush()
    versiones = db.scalars(
        select(VersionReceta)
        .join(RenglonReceta, RenglonReceta.version_id == VersionReceta.id)
        .outerjoin(InformacionNutricionalVersion, InformacionNutricionalVersion.version_id == VersionReceta.id)
        .where(
            RenglonReceta.insumo_id == insumo_id,
            or_(
                VersionReceta.estado == EstadoVersionReceta.VIGENTE,
                InformacionNutricionalVersion.id.is_(None),
                InformacionNutricionalVersion.completa.is_(False),
            ),
        )
        .distinct()
    ).all()
    for version in versiones:
        calcular_informacion(db, version)
    return len(versiones)


def obtener_o_calcular(db: Session, version: VersionReceta) -> InformacionNutricionalVersion:
    informacion = db.scalar(
        select(InformacionNutricionalVersion).where(InformacionNutricionalVersion.version_id == version.id)
    )
    return informacion if informacion is not None else calcular_informacion(db, version)
