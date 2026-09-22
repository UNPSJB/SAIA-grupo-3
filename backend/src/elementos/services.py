from typing import Dict, Any
from sqlalchemy import select, update, func
from sqlalchemy.orm import Session
from src.elementos.models import Elemento
from src.elementos import schemas, exceptions


def crear_elemento(db: Session, elemento: schemas.ElementoCreate) -> schemas.Elemento:
    _elemento = Elemento(**elemento.model_dump())
    db.add(_elemento)
    db.commit()
    db.refresh(_elemento)
    return _elemento

def listar_elementos(
    db: Session, 
    page: int = 1, 
    size: int = 10, 
    mostrar_inactivos: bool = False,
    ordenar_por: str = "id",
    orden: str = "asc"
) -> Dict[str, Any]:
    skip = (page - 1) * size
    query = select(Elemento)
    
    if not mostrar_inactivos:
        query = query.where(Elemento.activo == True)

    # Lógica de ordenamiento
    columna_orden = getattr(Elemento, ordenar_por, Elemento.id)
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

def leer_elemento(db: Session, elemento_id: int, incluir_inactivos: bool = False) -> schemas.Elemento:
    """Busca un elemento. Si incluir_inactivos es False, solo trae elementos activos."""
    query = select(Elemento).where(Elemento.id == elemento_id)
    if not incluir_inactivos:
        query = query.where(Elemento.activo == True)

    db_elemento = db.scalar(query)
    if db_elemento is None:
        raise exceptions.ElementoNoEncontrado()
    return db_elemento


def modificar_elemento(
    db: Session, elemento_id: int, elemento: schemas.ElementoUpdate
) -> Elemento:
    # Pasamos incluir_inactivos=True para poder recuperar y reactivar el elemento
    db_elemento = leer_elemento(db, elemento_id, incluir_inactivos=True)
    datos_actualizar = elemento.model_dump(exclude_unset=True)

    db.execute(
        update(Elemento)
        .where(Elemento.id == elemento_id)
        .values(**datos_actualizar)
    )
    db.commit()
    db.refresh(db_elemento)
    return db_elemento

def eliminar_elemento(db: Session, elemento_id: int) -> schemas.ElementoDelete:
    db_elemento = leer_elemento(db, elemento_id)
    
    db_elemento.activo = False
    db.commit()
    db.refresh(db_elemento)
    
    return db_elemento