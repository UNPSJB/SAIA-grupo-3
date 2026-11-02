from src.stock import revisar, revertir_si_falla
from fastapi import HTTPException
from src.pagination import filtrar_ordenar
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

@revertir_si_falla
def crear_insumo(db: Session, insumo: schemas.InsumoCreate) -> Insumo:
    _validar_duplicados(db, insumo.nombre)
    leer_unidad_medida(db, insumo.unidad_medida_id)
    
    _insumo = Insumo(**insumo.model_dump())
    db.add(_insumo)
    revisar(db, _insumo)
    db.commit()
    db.refresh(_insumo)
    return _insumo

def listar_insumos(
    db: Session, page: int = 1, size: int = 10, mostrar_inactivos: bool = False, ordenar_por: str = "id", orden: str = "asc", buscar: str = "", solo_stock_bajo: bool = False
) -> Dict[str, Any]:
    skip = (page - 1) * size
    query = select(Insumo)
    if solo_stock_bajo:
        query = query.where(Insumo.activo.is_(True), Insumo.stock_minimo.is_not(None), Insumo.cantidad <= Insumo.stock_minimo)

    if not mostrar_inactivos:
        query = query.where(Insumo.activo == True)

    query = filtrar_ordenar(query, Insumo, buscar, [Insumo.nombre], ordenar_por, orden, {"id": Insumo.id, "nombre": Insumo.nombre, "unidad_medida_id": Insumo.unidad_medida_id, "activo": Insumo.activo})

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

@revertir_si_falla
def modificar_insumo(db: Session, insumo_id: int, insumo: schemas.InsumoUpdate) -> Insumo:
    from src.abastecimiento.models import LoteRecepcionInsumo
    from src.abastecimiento.services import bloquear_insumo

    try:
        db_insumo = bloquear_insumo(db, insumo_id, permitir_inactivo=True)
        datos_actualizar = {
            campo: valor for campo, valor in insumo.model_dump(exclude_unset=True).items()
            if valor is not None or campo == "stock_minimo"
        }
        tiene_recepciones = db.scalar(
            select(LoteRecepcionInsumo.id)
            .where(LoteRecepcionInsumo.insumo_id == insumo_id).limit(1)
        ) is not None
        if tiene_recepciones:
            if "unidad_medida_id" in datos_actualizar and datos_actualizar["unidad_medida_id"] != db_insumo.unidad_medida_id:
                raise HTTPException(409, "No se puede cambiar la unidad de un insumo con recepciones registradas.")
        if "nombre" in datos_actualizar:
            _validar_duplicados(db, datos_actualizar["nombre"], excluir_id=insumo_id)
        if "unidad_medida_id" in datos_actualizar:
            leer_unidad_medida(db, datos_actualizar["unidad_medida_id"])
        for campo, valor in datos_actualizar.items():
            setattr(db_insumo, campo, valor)
        revisar(db, db_insumo)
        db.commit()
        db.refresh(db_insumo)
        return db_insumo
    except Exception:
        db.rollback()
        raise

@revertir_si_falla
def eliminar_insumo(db: Session, insumo_id: int) -> schemas.InsumoDelete:
    db_insumo = leer_insumo(db, insumo_id)
    db_insumo.activo = False
    revisar(db, db_insumo)
    db.commit()
    db.refresh(db_insumo)
    return db_insumo
