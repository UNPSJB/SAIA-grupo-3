from datetime import date, timedelta
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
    
    # Si se modificó la frecuencia de recambio y el elemento ya tenía un recambio registrado, 
    # recalculamos la próxima alerta para que las fechas no queden desincronizadas.
    if "frecuencia_recambio" in datos_actualizar and db_elemento.fecha_ultimo_recambio:
        if db_elemento.frecuencia_recambio is not None:
            db_elemento.fecha_proximo_recambio = db_elemento.fecha_ultimo_recambio + timedelta(days=db_elemento.frecuencia_recambio)
        else:
            db_elemento.fecha_proximo_recambio = None
        db.commit()
        db.refresh(db_elemento)
        
    return db_elemento

def eliminar_elemento(db: Session, elemento_id: int) -> schemas.ElementoDelete:
    db_elemento = leer_elemento(db, elemento_id)
    
    db_elemento.activo = False
    db.commit()
    db.refresh(db_elemento)
    
    return db_elemento

def registrar_recambio(db: Session, elemento_id: int, fecha_recambio: date) -> schemas.Elemento:
    """
    Registra el recambio físico y calcula automáticamente la próxima fecha de alerta según la frecuencia.
    """
    db_elemento = leer_elemento(db, elemento_id)
    
    db_elemento.fecha_ultimo_recambio = fecha_recambio
    
    # Recalcula automáticamente la próxima fecha si el elemento tiene frecuencia configurada
    if db_elemento.frecuencia_recambio is not None:
        db_elemento.fecha_proximo_recambio = fecha_recambio + timedelta(days=db_elemento.frecuencia_recambio)
    else:
        db_elemento.fecha_proximo_recambio = None
        
    db.commit()
    db.refresh(db_elemento)
    
    return db_elemento