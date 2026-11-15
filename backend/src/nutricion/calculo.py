from datetime import datetime
from typing import Optional

from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from src.insumos.constants import TipoInsumo
from src.nutricion.constants import (
    NUTRIENTES,
    NUTRIENTES_DE_ADITIVO,
    BaseCalculo,
    Faltante,
    FuenteNutricional,
    Nutriente,
    TipoFaltante,
)
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


def tiene_fuente(fila: ValorNutricionalInsumo) -> bool:
    if fila.fuente == FuenteNutricional.BASE_REFERENCIA:
        return fila.alimento_referencia_id is not None
    return bool(fila.detalle_fuente and fila.detalle_fuente.strip())


def _filas_por_insumo(db: Session, insumo_ids: set[int]) -> dict[int, dict[Nutriente, ValorNutricionalInsumo]]:
    resultado: dict[int, dict[Nutriente, ValorNutricionalInsumo]] = {insumo_id: {} for insumo_id in insumo_ids}
    filas = db.scalars(select(ValorNutricionalInsumo).where(ValorNutricionalInsumo.insumo_id.in_(insumo_ids))).all()
    for fila in filas:
        resultado[fila.insumo_id][fila.nutriente] = fila
    return resultado


def _faltante(tipo: TipoFaltante, mensaje: str, renglon: Optional[RenglonReceta] = None, nutrientes=(), sin_fuente=()) -> dict:
    insumo = None
    if renglon is not None:
        insumo = {"id": renglon.insumo_id, "nombre": renglon.insumo.nombre, "tipo": renglon.tipo.value}
    return {
        "tipo": tipo.value,
        "mensaje": mensaje,
        "insumo": insumo,
        "nutrientes": [n.value for n in nutrientes],
        "sin_fuente": [n.value for n in sin_fuente],
    }


def _nombres(nutrientes: list[Nutriente]) -> str:
    return ", ".join(NUTRIENTES[n][0].lower() for n in nutrientes)


def revisar_insumos(version: VersionReceta, filas: dict[int, dict[Nutriente, ValorNutricionalInsumo]]) -> list[dict]:
    faltantes = []
    for renglon in version.renglones:
        requeridos = [n for n in NUTRIENTES if _cuenta(renglon, n)]
        cargados = filas.get(renglon.insumo_id, {})
        sin_dato = [n for n in requeridos if n not in cargados]
        sin_fuente = [n for n in requeridos if n in cargados and not tiene_fuente(cargados[n])]
        if not sin_dato and not sin_fuente:
            continue
        partes = []
        if sin_dato:
            partes.append(Faltante.INSUMO_SIN_DATOS.format(nutrientes=_nombres(sin_dato)))
        if sin_fuente:
            partes.append(Faltante.INSUMO_SIN_FUENTE.format(nutrientes=_nombres(sin_fuente)))
        mensaje = Faltante.INSUMO.format(insumo=renglon.insumo.nombre, detalle="; ".join(partes))
        faltantes.append(_faltante(TipoFaltante.INSUMO, mensaje, renglon, sin_dato, sin_fuente))
    return faltantes


def revisar_version(db: Session, version: VersionReceta) -> list[dict]:
    faltantes = []
    if not version.composicion_completa:
        faltantes.append(_faltante(TipoFaltante.COMPOSICION, Faltante.COMPOSICION))
    base, rendimiento_base, problema = _rendimiento(version)
    if problema:
        faltantes.append(_faltante(TipoFaltante.RENDIMIENTO, problema))
    if base is not None:
        _, problema = _porcion(version, base, rendimiento_base)
        if problema:
            faltantes.append(_faltante(TipoFaltante.PORCION, problema))
    filas = _filas_por_insumo(db, {renglon.insumo_id for renglon in version.renglones})
    return faltantes + revisar_insumos(version, filas)


def calcular_informacion(db: Session, version: VersionReceta) -> InformacionNutricionalVersion:
    db.flush()
    faltantes = revisar_version(db, version)
    base, rendimiento_base, _ = _rendimiento(version)
    porcion_base = _porcion(version, base, rendimiento_base)[0] if base is not None else None

    filas = _filas_por_insumo(db, {renglon.insumo_id for renglon in version.renglones})
    totales: dict[Nutriente, Optional[float]] = {}
    for nutriente in NUTRIENTES:
        total = 0.0
        for renglon in version.renglones:
            if not _cuenta(renglon, nutriente):
                continue
            fila = filas[renglon.insumo_id].get(nutriente)
            if fila is None or renglon.gramos is None or total is None:
                total = None
                continue
            total += renglon.gramos * fila.valor / 100
        totales[nutriente] = total

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
    calculados = []
    for nutriente, total in totales.items():
        por_100 = total * 100 / rendimiento_base if total is not None and rendimiento_base else None
        por_porcion = por_100 * porcion_base / 100 if por_100 is not None and porcion_base else None
        calculados.append(
            ValorNutricionalVersion(nutriente=nutriente, total_receta=total, por_100=por_100, por_porcion=por_porcion)
        )
    informacion.valores.clear()
    db.flush()
    informacion.valores.extend(calculados)
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
    formato_anterior = informacion is not None and any(isinstance(f, str) for f in informacion.faltantes)
    if informacion is None or formato_anterior:
        return calcular_informacion(db, version)
    return informacion
