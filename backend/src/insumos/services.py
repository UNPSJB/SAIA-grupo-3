from typing import List
from sqlalchemy import delete, select, update
from sqlalchemy.orm import Session
from src.insumos import models, schemas, exceptions

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

#Insumo

def _validar_duplicados(
    db: Session, insumo: schemas.InsumoBase, excluir_id: int | None = None
) -> None:
    """Verifica que el nombre del insumo no esté ya en uso por otro registro."""
    query_nombre = select(models.Insumo).where(models.Insumo.nombre == insumo.nombre)
    
    if excluir_id is not None:
        query_nombre = query_nombre.where(models.Insumo.id != excluir_id)

    if db.scalar(query_nombre) is not None:
        raise exceptions.NombreDuplicado()


def crear_insumo(db: Session, insumo: schemas.InsumoCreate) -> schemas.Insumo:
    _validar_duplicados(db, insumo)
    leer_unidad_medida(db, insumo.unidad_medida_id)
    
    _insumo = models.Insumo(**insumo.model_dump())
    db.add(_insumo)
    db.commit()
    db.refresh(_insumo)
    
    _insumo.sufijo_unidad = _insumo.unidadMedidaObj.sufijo
    return _insumo


def listar_insumos(db: Session) -> List[schemas.Insumo]:
    insumos = db.scalars(select(models.Insumo)).all()
    for insumo in insumos:
        insumo.sufijo_unidad = insumo.unidadMedidaObj.sufijo
    return insumos


def leer_insumo(db: Session, insumo_id: int) -> schemas.Insumo:
    db_insumo = db.scalar(select(models.Insumo).where(models.Insumo.id == insumo_id))
    if db_insumo is None:
        raise exceptions.InsumoNoEncontrado()
        
    db_insumo.sufijo_unidad = db_insumo.unidadMedidaObj.sufijo
    return db_insumo


def modificar_insumo(
    db: Session, insumo_id: int, insumo: schemas.InsumoUpdate
) -> models.Insumo:
    db_insumo = leer_insumo(db, insumo_id)
    _validar_duplicados(db, insumo, excluir_id=insumo_id)
    
    leer_unidad_medida(db, insumo.unidad_medida_id)

    db.execute(
        update(models.Insumo)
        .where(models.Insumo.id == insumo_id)
        .values(**insumo.model_dump())
    )
    db.commit()
    db.refresh(db_insumo)
    
    db_insumo.sufijo_unidad = db_insumo.unidadMedidaObj.sufijo
    return db_insumo


def eliminar_insumo(db: Session, insumo_id: int) -> schemas.InsumoDelete:
    db_insumo = leer_insumo(db, insumo_id)
    db_insumo.sufijo_unidad = db_insumo.unidadMedidaObj.sufijo
    
    db.execute(delete(models.Insumo).where(models.Insumo.id == insumo_id))
    db.commit()
    return db_insumo