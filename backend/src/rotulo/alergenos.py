from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional

from sqlalchemy import select
from sqlalchemy.orm import Session

from src.alergeno.models import Alergeno
from src.alergeno.services import resolver as resolver_alergenos
from src.personal.models import Personal
from src.receta.models import VersionReceta
from src.rotuladoFrontal.aplicabilidad import version_vigente
from src.rotulo import exceptions, schemas
from src.rotulo.constants import (
    ETIQUETAS_CONSERVACION,
    Aviso,
    EstadoDeclaracion,
    UnidadVidaUtil,
)
from src.rotulo.models import BorradorRotulo


@dataclass
class Propuesta:
    version: Optional[VersionReceta]
    alergenos: dict[int, Alergeno] = field(default_factory=dict)
    causas: dict[int, list[schemas.InsumoCausa]] = field(default_factory=dict)
    causas_gluten: list[schemas.InsumoCausa] = field(default_factory=list)
    gluten_sin_cereal: bool = False

    @property
    def alergeno_ids(self) -> list[int]:
        return sorted(self.alergenos)

    @property
    def contiene_gluten(self) -> bool:
        return bool(self.causas_gluten)

    def ordenados(self) -> list[Alergeno]:
        return sorted(self.alergenos.values(), key=lambda a: (a.orden, a.nombre))


def armar_propuesta(db: Session, producto_id: int) -> Propuesta:
    version = version_vigente(db, producto_id)
    propuesta = Propuesta(version=version)
    if version is None:
        return propuesta
    for renglon in version.renglones:
        insumo = renglon.insumo
        causa = schemas.InsumoCausa(id=insumo.id, nombre=insumo.nombre)
        activos = [alergeno for alergeno in insumo.alergenos if alergeno.activo]
        for alergeno in activos:
            propuesta.alergenos[alergeno.id] = alergeno
            propuesta.causas.setdefault(alergeno.id, []).append(causa)
        cereal = any(alergeno.implica_gluten for alergeno in activos)
        if insumo.contiene_gluten or cereal:
            propuesta.causas_gluten.append(causa)
            if not cereal:
                propuesta.gluten_sin_cereal = True
    return propuesta


def unir(nombres: list[str]) -> str:
    if len(nombres) == 1:
        return nombres[0]
    return ", ".join(nombres[:-1]) + " y " + nombres[-1]


def texto_contiene(alergenos: list[Alergeno]) -> Optional[str]:
    if not alergenos:
        return None
    return f"CONTIENE {unir([a.texto_declaracion for a in alergenos])}.".upper()


def texto_puede_contener(alergenos: list[Alergeno]) -> Optional[str]:
    if not alergenos:
        return None
    return f"PUEDE CONTENER {unir([a.texto_declaracion for a in alergenos])}.".upper()


def huella(propuesta: Propuesta, puede_contener_ids: list[int]) -> dict:
    return {
        "alergeno_ids": propuesta.alergeno_ids,
        "gluten": propuesta.contiene_gluten,
        "puede_contener_ids": sorted(puede_contener_ids or []),
    }


def volver_a_sugerida(borrador: BorradorRotulo, aviso: Optional[str]) -> None:
    borrador.alergenos_estado = EstadoDeclaracion.SUGERIDA
    borrador.alergenos_confirmado_por_id = None
    borrador.alergenos_confirmado_en = None
    borrador.alergenos_aviso = aviso


def revisar_declaracion(borrador: BorradorRotulo, propuesta: Propuesta) -> bool:
    if borrador.alergenos_estado != EstadoDeclaracion.CONFIRMADA:
        return False
    confirmada = borrador.alergenos_confirmacion or {}
    version = propuesta.version
    if version is None or version.id != borrador.alergenos_version_receta_id:
        volver_a_sugerida(
            borrador,
            Aviso.RECETA_CAMBIO.format(
                anterior=confirmada.get("version_numero", "?"), actual=version.numero if version else "—"
            ),
        )
        return True
    actual = huella(propuesta, borrador.puede_contener_ids)
    if actual["alergeno_ids"] != confirmada.get("alergeno_ids") or actual["gluten"] != confirmada.get("gluten"):
        volver_a_sugerida(borrador, Aviso.MARCAS_CAMBIO)
        return True
    return False


def actualizar_puede_contener(
    db: Session, borrador: BorradorRotulo, ids: list[int], propuesta: Propuesta
) -> None:
    actuales = db.scalars(select(Alergeno).where(Alergeno.id.in_(borrador.puede_contener_ids or []))).all()
    elegidos = resolver_alergenos(db, ids, actuales)
    nuevos = sorted(a.id for a in elegidos if a.id not in propuesta.alergenos)
    if nuevos == sorted(borrador.puede_contener_ids or []):
        return
    borrador.puede_contener_ids = nuevos
    if borrador.alergenos_estado == EstadoDeclaracion.CONFIRMADA:
        volver_a_sugerida(borrador, Aviso.PUEDE_CONTENER_CAMBIO)


def confirmar(db: Session, borrador: BorradorRotulo, persona: Personal) -> None:
    propuesta = armar_propuesta(db, borrador.producto_id)
    if propuesta.version is None:
        raise exceptions.SinRecetaParaAlergenos()
    ahora = datetime.now()
    borrador.alergenos_estado = EstadoDeclaracion.CONFIRMADA
    borrador.alergenos_confirmado_por_id = persona.id
    borrador.alergenos_confirmado_en = ahora
    borrador.alergenos_version_receta_id = propuesta.version.id
    borrador.alergenos_confirmacion = {
        **huella(propuesta, borrador.puede_contener_ids),
        "version_numero": propuesta.version.numero,
        "texto_contiene": texto_contiene(propuesta.ordenados()),
        "texto_puede_contener": texto_puede_contener(_puede_contener(db, borrador)),
    }
    borrador.alergenos_aviso = None


def _puede_contener(db: Session, borrador: BorradorRotulo) -> list[Alergeno]:
    ids = borrador.puede_contener_ids or []
    if not ids:
        return []
    return list(db.scalars(select(Alergeno).where(Alergeno.id.in_(ids)).order_by(Alergeno.orden, Alergeno.nombre)))


def declaracion(db: Session, borrador: BorradorRotulo, propuesta: Propuesta) -> schemas.DeclaracionAlergenos:
    contiene = propuesta.ordenados()
    puede = _puede_contener(db, borrador)
    advertencias = [Aviso.GLUTEN_SIN_CEREAL] if propuesta.gluten_sin_cereal else []
    return schemas.DeclaracionAlergenos(
        estado=borrador.alergenos_estado,
        version_receta_numero=propuesta.version.numero if propuesta.version else None,
        contiene=[
            schemas.AlergenoDeclarado(
                id=a.id,
                nombre=a.nombre,
                grupo=a.grupo,
                implica_gluten=a.implica_gluten,
                causas=propuesta.causas.get(a.id, []),
            )
            for a in contiene
        ],
        contiene_gluten=propuesta.contiene_gluten,
        causas_gluten=propuesta.causas_gluten,
        puede_contener=[
            schemas.AlergenoElegible(id=a.id, nombre=a.nombre, grupo=a.grupo, activo=a.activo) for a in puede
        ],
        texto_contiene=texto_contiene(contiene),
        texto_puede_contener=texto_puede_contener(puede),
        confirmado_por=borrador.alergenos_confirmado_por,
        confirmado_en=borrador.alergenos_confirmado_en,
        aviso=borrador.alergenos_aviso,
        advertencias=advertencias,
    )


def _numero(valor: float) -> str:
    return f"{valor:g}".replace(".", ",")


def leyenda_conservacion(borrador: BorradorRotulo) -> Optional[str]:
    if borrador.conservacion_condicion is None:
        return None
    texto = ETIQUETAS_CONSERVACION[borrador.conservacion_condicion]
    minima, maxima = borrador.conservacion_temp_min, borrador.conservacion_temp_max
    if minima is not None and maxima is not None:
        texto += f" entre {_numero(minima)} °C y {_numero(maxima)} °C"
    elif maxima is not None:
        texto += f" a {_numero(maxima)} °C o menos"
    elif minima is not None:
        texto += f" a {_numero(minima)} °C o más"
    texto += "."
    if borrador.conservacion_duracion_cantidad:
        cantidad = borrador.conservacion_duracion_cantidad
        if borrador.conservacion_duracion_unidad == UnidadVidaUtil.MESES:
            unidad = "mes" if cantidad == 1 else "meses"
        else:
            unidad = "día" if cantidad == 1 else "días"
        texto += f" Duración en estas condiciones: {cantidad} {unidad}."
    if borrador.conservacion_abierto:
        abierto = borrador.conservacion_abierto.rstrip(".")
        texto += f" Una vez abierto: {abierto[0].lower() + abierto[1:]}."
    return texto
