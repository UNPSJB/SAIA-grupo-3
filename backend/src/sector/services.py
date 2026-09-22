from typing import Dict, Any
from sqlalchemy import select, update, func
from sqlalchemy.orm import Session
from src.sector.models import Sector
from src.sector import schemas, exceptions

def _validar_duplicados(
    db: Session, nombre_sector: str, excluir_id: int | None = None
) -> None:
    query = select(Sector).where(func.lower(Sector.nombre) == nombre_sector.lower())
    
    if excluir_id is not None:
        query = query.where(Sector.id != excluir_id)

    if db.scalar(query) is not None:
        raise exceptions.NombreDuplicado()


def crear_sector(db: Session, sector: schemas.SectorCreate) -> Sector:
    _validar_duplicados(db, sector.nombre)
    _sector = Sector(**sector.model_dump())
    db.add(_sector)
    db.commit()
    db.refresh(_sector)
    return _sector


def listar_sectores(
    db: Session, 
    page: int = 1, 
    size: int = 10,
    mostrar_inactivos: bool = False,
    ordenar_por: str = "id",
    orden: str = "asc"
) -> Dict[str, Any]:
    skip = (page - 1) * size
    query = select(Sector)
    
    # Filtro de inactivos
    if not mostrar_inactivos:
        query = query.where(Sector.activo == True)

    # Lógica de ordenamiento
    columna_orden = getattr(Sector, ordenar_por, Sector.id)
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
        "pages": pages
    }


def leer_sector(db: Session, sector_id: int, incluir_inactivos: bool = False) -> Sector:
    query = select(Sector).where(Sector.id == sector_id)
    if not incluir_inactivos:
        query = query.where(Sector.activo == True)
        
    db_sector = db.scalar(query)
    if db_sector is None:
        raise exceptions.SectorNoEncontrado() 
    return db_sector


def modificar_sector(
    db: Session, sector_id: int, sector: schemas.SectorUpdate
) -> Sector:
    # Pasamos incluir_inactivos=True para permitir reactivación desde el frontend
    db_sector = leer_sector(db, sector_id, incluir_inactivos=True)
    
    if sector.nombre is not None:
        _validar_duplicados(db, sector.nombre, excluir_id=sector_id)
        
    db.execute(
        update(Sector)
        .where(Sector.id == sector_id)
        .values(**sector.model_dump(exclude_unset=True))
    )
    db.commit()
    db.refresh(db_sector)
    return db_sector


def eliminar_sector(db: Session, sector_id: int) -> schemas.SectorDelete:
    db_sector = leer_sector(db, sector_id)
    
    equipos_activos = [e for e in db_sector.equipos if e.activo]
    if len(equipos_activos) > 0:
        raise exceptions.SectorTieneEquipos()
    
    db_sector.activo = False
    db.commit()
    db.refresh(db_sector)
    
    return db_sector