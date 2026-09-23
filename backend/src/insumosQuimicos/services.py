from typing import Dict, Any
from sqlalchemy import select, update, func
from sqlalchemy.orm import Session
from src.insumosQuimicos.models import InsumoQuimico
from src.insumosQuimicos import schemas, exceptions
from src.unidadMedida.services import leer_unidad_medida


def _validar_duplicados(db: Session, nombre: str, excluir_id: int | None = None) -> None:
    query = select(InsumoQuimico).where(
        func.lower(InsumoQuimico.nombre) == nombre.strip().lower()
    )
    if excluir_id is not None:
        query = query.where(InsumoQuimico.id != excluir_id)

    if db.scalar(query) is not None:
        raise exceptions.NombreDuplicado()


def crear_insumo_quimico(
    db: Session, insumo: schemas.InsumoQuimicoCreate
) -> InsumoQuimico:
    _validar_duplicados(db, insumo.nombre)
    leer_unidad_medida(db, insumo.unidad_medida_id)

    nuevo_insumo = InsumoQuimico(**insumo.model_dump())
    db.add(nuevo_insumo)
    db.commit()
    db.refresh(nuevo_insumo)
    return nuevo_insumo


def listar_insumos_quimicos(
    db: Session,
    page: int = 1,
    size: int = 10,
    mostrar_inactivos: bool = False,
    ordenar_por: str = "id",
    orden: str = "asc",
    buscar: str = "",
    tipo_quimico: str | None = None,
) -> Dict[str, Any]:
    skip = (page - 1) * size
    query = select(InsumoQuimico)

    if not mostrar_inactivos:
        query = query.where(InsumoQuimico.activo == True)

    if buscar.strip():
        termino = f"%{buscar.strip().lower()}%"
        query = query.where(func.lower(InsumoQuimico.nombre).like(termino))

    if tipo_quimico:
        query = query.where(InsumoQuimico.tipo_quimico == tipo_quimico.lower())

    columna_orden = getattr(InsumoQuimico, ordenar_por, InsumoQuimico.id)
    if orden == "desc":
        query = query.order_by(columna_orden.desc())
    else:
        query = query.order_by(columna_orden.asc())

    total = db.scalar(select(func.count()).select_from(query.subquery()))
    items = db.scalars(query.offset(skip).limit(size)).all()
    pages = (total + size - 1) // size if total else 0

    return {
        "items": items,
        "total": total,
        "page": page,
        "size": size,
        "pages": pages,
    }


def leer_insumo_quimico(
    db: Session, insumo_id: int, incluir_inactivos: bool = False
) -> InsumoQuimico:
    query = select(InsumoQuimico).where(InsumoQuimico.id == insumo_id)
    if not incluir_inactivos:
        query = query.where(InsumoQuimico.activo == True)

    insumo = db.scalar(query)
    if insumo is None:
        raise exceptions.InsumoQuimicoNoEncontrado()
    return insumo


def modificar_insumo_quimico(
    db: Session, insumo_id: int, insumo: schemas.InsumoQuimicoUpdate
) -> InsumoQuimico:
    db_insumo = leer_insumo_quimico(db, insumo_id, incluir_inactivos=True)
    datos_actualizar = insumo.model_dump(exclude_unset=True)

    if "nombre" in datos_actualizar and datos_actualizar["nombre"] is not None:
        _validar_duplicados(db, datos_actualizar["nombre"], excluir_id=insumo_id)

    if "unidad_medida_id" in datos_actualizar and datos_actualizar["unidad_medida_id"] is not None:
        leer_unidad_medida(db, datos_actualizar["unidad_medida_id"])

    db.execute(
        update(InsumoQuimico)
        .where(InsumoQuimico.id == insumo_id)
        .values(**datos_actualizar)
    )
    db.commit()
    db.refresh(db_insumo)
    return db_insumo


def eliminar_insumo_quimico(
    db: Session, insumo_id: int
) -> schemas.InsumoQuimicoDelete:
    # Baja lógica
    db_insumo = leer_insumo_quimico(db, insumo_id)
    db_insumo.activo = False
    db.commit()
    db.refresh(db_insumo)
    return db_insumo