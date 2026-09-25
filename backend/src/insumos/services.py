from typing import List, Dict, Any
from sqlalchemy import select, update, func
from sqlalchemy.orm import Session
from src.insumos.models import Insumo
from src.insumos import schemas, exceptions
from src.unidadMedida.services import leer_unidad_medida

def _validar_duplicados(db: Session, nombre: str, excluir_id: int | None = None) -> None:
    query_nombre = select(Insumo).where(func.lower(Insumo.nombre) == nombre.strip().lower())
    if excluir_id is not None:
        query_nombre = query_nombre.where(Insumo.id != excluir_id)
    if db.scalar(query_nombre) is not None:
        raise exceptions.NombreDuplicado()

def crear_insumo(db: Session, insumo: schemas.InsumoCreate) -> Insumo:
    _validar_duplicados(db, insumo.nombre)
    leer_unidad_medida(db, insumo.unidad_medida_id)
    
    _insumo = Insumo(**insumo.model_dump())
    db.add(_insumo)
    db.commit()
    db.refresh(_insumo)
    return _insumo

def listar_insumos(
    db: Session, page: int = 1, size: int = 10, mostrar_inactivos: bool = False, ordenar_por: str = "id", orden: str = "asc", buscar: str = ""
) -> Dict[str, Any]:
    skip = (page - 1) * size
    query = select(Insumo)

    if not mostrar_inactivos:
        query = query.where(Insumo.activo == True)

    if buscar.strip():
        termino = f"%{buscar.strip().lower()}%"
        query = query.where(func.lower(Insumo.nombre).like(termino))

    columna_orden = getattr(Insumo, ordenar_por, Insumo.id)
    if orden == "desc":
        query = query.order_by(columna_orden.desc())
    else:
        query = query.order_by(columna_orden.asc())

    total = db.scalar(select(func.count()).select_from(query.subquery()))
    items = db.scalars(query.offset(skip).limit(size)).all()
    pages = (total + size - 1) // size if total else 0

    return {"items": items, "total": total, "page": page, "size": size, "pages": pages}

def leer_insumo(db: Session, insumo_id: int, incluir_inactivos: bool = False) -> Insumo:
    query = select(Insumo).where(Insumo.id == insumo_id)
    if not incluir_inactivos:
        query = query.where(Insumo.activo == True)
        
    db_insumo = db.scalar(query)
    if db_insumo is None:
        raise exceptions.InsumoNoEncontrado()
    return db_insumo

def modificar_insumo(db: Session, insumo_id: int, insumo: schemas.InsumoUpdate) -> Insumo:
    db_insumo = leer_insumo(db, insumo_id, incluir_inactivos=True)
    datos_actualizar = insumo.model_dump(exclude_unset=True)

    if "nombre" in datos_actualizar and datos_actualizar["nombre"] is not None:
        _validar_duplicados(db, datos_actualizar["nombre"], excluir_id=insumo_id)
    
    if "unidad_medida_id" in datos_actualizar and datos_actualizar["unidad_medida_id"] is not None:
        leer_unidad_medida(db, datos_actualizar["unidad_medida_id"])

    db.execute(update(Insumo).where(Insumo.id == insumo_id).values(**datos_actualizar))
    db.commit()
    db.refresh(db_insumo)
    return db_insumo

def eliminar_insumo(db: Session, insumo_id: int) -> schemas.InsumoDelete:
    db_insumo = leer_insumo(db, insumo_id)
    db_insumo.activo = False
    db.commit()
    db.refresh(db_insumo)
    return db_insumo