from typing import Any, Optional

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from src.aditivoReferencia import exceptions, schemas
from src.aditivoReferencia.models import AditivoReferencia
from src.claseFuncional.models import ClaseFuncional
from src.claseFuncional.services import leer_clase
from src.pagination import filtrar_ordenar


def _validar_unicos(db: Session, nombre: str, ins: Optional[str], excluir_id: int | None = None) -> None:
    por_nombre = select(AditivoReferencia.id).where(func.lower(AditivoReferencia.nombre) == nombre.strip().lower())
    if excluir_id is not None:
        por_nombre = por_nombre.where(AditivoReferencia.id != excluir_id)
    if db.scalar(por_nombre) is not None:
        raise exceptions.AditivoDuplicado()
    if ins:
        por_ins = select(AditivoReferencia.id).where(AditivoReferencia.ins == ins)
        if excluir_id is not None:
            por_ins = por_ins.where(AditivoReferencia.id != excluir_id)
        if db.scalar(por_ins) is not None:
            raise exceptions.InsDuplicado()


def _validar_clase(db: Session, clase_id: int, ins: Optional[str]) -> ClaseFuncional:
    clase = leer_clase(db, clase_id)
    if not clase.activo:
        raise exceptions.ClaseInactiva()
    if not ins and not clase.ins_opcional:
        raise exceptions.InsObligatorio()
    return clase


def crear_aditivo(db: Session, datos: schemas.AditivoReferenciaCreate) -> AditivoReferencia:
    _validar_clase(db, datos.clase_funcional_id, datos.ins)
    _validar_unicos(db, datos.nombre, datos.ins)
    aditivo = AditivoReferencia(**datos.model_dump())
    db.add(aditivo)
    db.commit()
    db.refresh(aditivo)
    return aditivo


def listar_aditivos(
    db: Session,
    page: int = 1,
    size: int = 10,
    mostrar_inactivos: bool = False,
    ordenar_por: str = "nombre",
    orden: str = "asc",
    buscar: str = "",
    clase_funcional_id: Optional[int] = None,
) -> dict[str, Any]:
    query = select(AditivoReferencia).join(AditivoReferencia.clase_funcional)
    if not mostrar_inactivos:
        query = query.where(AditivoReferencia.activo.is_(True))
    if clase_funcional_id is not None:
        query = query.where(AditivoReferencia.clase_funcional_id == clase_funcional_id)
    query = filtrar_ordenar(
        query, AditivoReferencia, buscar,
        [AditivoReferencia.nombre, AditivoReferencia.ins, ClaseFuncional.nombre],
        ordenar_por, orden,
        {
            "id": AditivoReferencia.id,
            "nombre": AditivoReferencia.nombre,
            "ins": AditivoReferencia.ins,
            "clase_funcional": ClaseFuncional.nombre,
            "activo": AditivoReferencia.activo,
        },
    )
    total = db.scalar(select(func.count()).select_from(query.subquery()))
    items = db.scalars(query.offset((page - 1) * size).limit(size)).unique().all()
    pages = (total + size - 1) // size if total else 0
    return {"items": items, "total": total, "page": page, "size": size, "pages": pages}


def listar_aditivos_activos(db: Session) -> list[AditivoReferencia]:
    return list(
        db.scalars(
            select(AditivoReferencia)
            .join(AditivoReferencia.clase_funcional)
            .where(AditivoReferencia.activo.is_(True), ClaseFuncional.activo.is_(True))
            .order_by(ClaseFuncional.nombre, AditivoReferencia.nombre)
        ).unique()
    )


def leer_aditivo(db: Session, aditivo_id: int) -> AditivoReferencia:
    aditivo = db.get(AditivoReferencia, aditivo_id)
    if aditivo is None:
        raise exceptions.AditivoNoEncontrado()
    return aditivo


def modificar_aditivo(db: Session, aditivo_id: int, datos: schemas.AditivoReferenciaUpdate) -> AditivoReferencia:
    aditivo = leer_aditivo(db, aditivo_id)
    cambios = {campo: valor for campo, valor in datos.model_dump(exclude_unset=True).items() if valor is not None or campo == "ins"}
    clase_id = cambios.get("clase_funcional_id", aditivo.clase_funcional_id)
    ins = cambios["ins"] if "ins" in cambios else aditivo.ins
    nombre = cambios.get("nombre", aditivo.nombre)
    if {"clase_funcional_id", "ins"} & cambios.keys() or cambios.get("activo"):
        _validar_clase(db, clase_id, ins)
    _validar_unicos(db, nombre, ins, excluir_id=aditivo_id)
    for campo, valor in cambios.items():
        setattr(aditivo, campo, valor)
    db.commit()
    db.refresh(aditivo)
    return aditivo


def eliminar_aditivo(db: Session, aditivo_id: int) -> AditivoReferencia:
    aditivo = leer_aditivo(db, aditivo_id)
    aditivo.activo = False
    db.commit()
    db.refresh(aditivo)
    return aditivo
