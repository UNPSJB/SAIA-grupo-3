from typing import List, Dict, Any
from sqlalchemy import select, update, func
from sqlalchemy.orm import Session
from src.unidadMedida import models, schemas, exceptions

def _validar_duplicados_unidad(db: Session, unidad: schemas.UnidadMedidaBase, excluir_id: int | None = None) -> None:
    query = select(models.UnidadMedida).where(
        func.lower(models.UnidadMedida.sufijo) == unidad.sufijo.strip().lower()
    )
    if excluir_id is not None:
        query = query.where(models.UnidadMedida.id != excluir_id)
    if db.scalar(query) is not None:
        raise exceptions.UnidadDuplicada()

def crear_unidad_medida(db: Session, unidad: schemas.UnidadMedidaCreate) -> models.UnidadMedida:
    _validar_duplicados_unidad(db, unidad)
    
    _unidad = models.UnidadMedida(**unidad.model_dump())
    db.add(_unidad)
    db.commit()
    db.refresh(_unidad)
    return _unidad

def listar_unidades_medida(
    db: Session, page: int = 1, size: int = 10, mostrar_inactivos: bool = False, ordenar_por: str = "id", orden: str = "asc", buscar: str = ""
) -> Dict[str, Any]:
    skip = (page - 1) * size
    query = select(models.UnidadMedida)

    if not mostrar_inactivos:
        query = query.where(models.UnidadMedida.activo == True)

    if buscar.strip():
        termino = f"%{buscar.strip().lower()}%"
        query = query.where(func.lower(models.UnidadMedida.sufijo).like(termino))

    columna_orden = getattr(models.UnidadMedida, ordenar_por, models.UnidadMedida.id)
    if orden == "desc":
        query = query.order_by(columna_orden.desc())
    else:
        query = query.order_by(columna_orden.asc())

    total = db.scalar(select(func.count()).select_from(query.subquery()))
    items = db.scalars(query.offset(skip).limit(size)).all()
    pages = (total + size - 1) // size if total else 0

    return {"items": items, "total": total, "page": page, "size": size, "pages": pages}

def leer_unidad_medida(db: Session, unidad_id: int, incluir_inactivos: bool = False) -> models.UnidadMedida:
    query = select(models.UnidadMedida).where(models.UnidadMedida.id == unidad_id)
    if not incluir_inactivos:
        query = query.where(models.UnidadMedida.activo == True)
        
    db_unidad = db.scalar(query)
    if db_unidad is None:
        raise exceptions.UnidadMedidaNoEncontrada()
    return db_unidad

def modificar_unidad_medida(db: Session, unidad_id: int, unidad_in: schemas.UnidadMedidaUpdate) -> models.UnidadMedida:
    db_unidad = leer_unidad_medida(db, unidad_id, incluir_inactivos=True)
    datos_actualizar = unidad_in.model_dump(exclude_unset=True)

    if "sufijo" in datos_actualizar and datos_actualizar["sufijo"] is not None:
        _validar_duplicados_unidad(db, datos_actualizar["sufijo"], excluir_id=unidad_id)
        
    db.execute(update(models.UnidadMedida).where(models.UnidadMedida.id == unidad_id).values(**datos_actualizar))
    db.commit()
    db.refresh(db_unidad)
    return db_unidad

def eliminar_unidad_medida(db: Session, unidad_id: int) -> schemas.UnidadMedidaDelete:
    db_unidad = leer_unidad_medida(db, unidad_id)
    db_unidad.activo = False 
    db.commit()
    db.refresh(db_unidad)
    return db_unidad
