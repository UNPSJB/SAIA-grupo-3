from typing import List
from sqlalchemy import delete, select, update
from sqlalchemy.orm import Session
from src.unidadMedida import models, schemas, exceptions

#Unidad de medida

def crear_unidad_medida(db: Session, unidad: schemas.UnidadMedidaCreate) -> schemas.UnidadMedida:
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
    
    db.delete(db_unidad)
    db.commit()
