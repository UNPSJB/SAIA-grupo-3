from typing import Dict, Any
from sqlalchemy import select, update, func
from sqlalchemy.orm import Session
from src.equipos.models import Equipo
from src.equipos import schemas, exceptions
from src.sector.models import Sector


def _verificar_sector_activo(db: Session, sector_id: int) -> None:
    sector = db.scalar(
        select(Sector).where(Sector.id == sector_id, Sector.activo == True)
    )
    if sector is None:
        raise exceptions.SectorNoEncontrado()


def _verificar_numero_serie(db: Session, numero_serie: str, excluir_id: int | None = None) -> None:
    query = select(Equipo).where(func.lower(Equipo.numero_serie) == numero_serie.lower())
    
    if excluir_id is not None:
        query = query.where(Equipo.id != excluir_id)
        
    if db.scalar(query) is not None:
        raise exceptions.NumeroSerieDuplicado()


def crear_equipo(db: Session, equipo: schemas.EquipoCreate) -> schemas.Equipo:
    _verificar_sector_activo(db, equipo.sector_id)
    _verificar_numero_serie(db, equipo.numero_serie)

    _equipo = Equipo(**equipo.model_dump())
    db.add(_equipo)
    db.commit()
    db.refresh(_equipo)
    return _equipo

def listar_equipos(
    db: Session, 
    page: int = 1, 
    size: int = 10, 
    mostrar_inactivos: bool = False,
    ordenar_por: str = "id",
    orden: str = "asc"
) -> Dict[str, Any]:
    skip = (page - 1) * size
    query = select(Equipo)
    
    if not mostrar_inactivos:
        query = query.where(Equipo.activo == True)

    # Lógica de ordenamiento
    columna_orden = getattr(Equipo, ordenar_por, Equipo.id)
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

def leer_equipo(db: Session, equipo_id: int, incluir_inactivos: bool = False) -> schemas.Equipo:
    """Busca un equipo. Si incluir_inactivos es False, solo trae equipos activos."""
    query = select(Equipo).where(Equipo.id == equipo_id)
    if not incluir_inactivos:
        query = query.where(Equipo.activo == True)

    db_equipo = db.scalar(query)
    if db_equipo is None:
        raise exceptions.EquipoNoEncontrado()
    return db_equipo


def modificar_equipo(
    db: Session, equipo_id: int, equipo: schemas.EquipoUpdate
) -> Equipo:
    # Pasamos incluir_inactivos=True para poder recuperar y reactivar el equipo
    db_equipo = leer_equipo(db, equipo_id, incluir_inactivos=True)
    datos_actualizar = equipo.model_dump(exclude_unset=True)

    if "sector_id" in datos_actualizar:
        _verificar_sector_activo(db, datos_actualizar["sector_id"])

    if "numero_serie" in datos_actualizar:
        _verificar_numero_serie(db, datos_actualizar["numero_serie"], excluir_id=equipo_id)

    db.execute(
        update(Equipo)
        .where(Equipo.id == equipo_id)
        .values(**datos_actualizar)
    )
    db.commit()
    db.refresh(db_equipo)
    return db_equipo

def eliminar_equipo(db: Session, equipo_id: int) -> schemas.EquipoDelete:
    db_equipo = leer_equipo(db, equipo_id)
    
    db_equipo.activo = False
    db.commit()
    db.refresh(db_equipo)
    
    return db_equipo