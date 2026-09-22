from typing import List
from sqlalchemy import delete, select, update, func
from sqlalchemy.orm import Session
from src.unidadMedida import models, schemas, exceptions

#Unidad de medida

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


def listar_unidades_medida(db: Session) -> List[schemas.UnidadMedida]:
    return db.scalars(select(models.UnidadMedida)).all()


def leer_unidad_medida(db: Session, unidad_id: int) -> schemas.UnidadMedida:
    db_unidad = db.scalar(select(models.UnidadMedida).where(models.UnidadMedida.id == unidad_id))
    if db_unidad is None:
        raise exceptions.UnidadMedidaNoEncontrada()
    return db_unidad

def modificar_unidad_medida(db: Session, unidad_id: int, payload: dict) -> schemas.UnidadMedida:
    db_unidad = db.scalar(select(models.UnidadMedida).where(models.UnidadMedida.id == unidad_id))
    if db_unidad is None:
        raise exceptions.UnidadMedidaNoEncontrada()
    
    for key, value in payload.items():
        if value is not None:
            setattr(db_unidad, key, value)
        
    db.commit()
    db.refresh(db_unidad)
    return db_unidad

def eliminar_unidad_medida(db: Session, unidad_id: int) -> None:
    db_unidad = db.scalar(select(models.UnidadMedida).where(models.UnidadMedida.id == unidad_id))
    if db_unidad is None:
        raise exceptions.UnidadMedidaNoEncontrada()
   #db_unidad.activo = False (Para la baja logica)
    db.delete(db_unidad)
    db.commit()
    
