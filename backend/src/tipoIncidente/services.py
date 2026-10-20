from src.pagination import filtrar_ordenar
from typing import Any, Dict
from sqlalchemy import func, select, update
from sqlalchemy.orm import Session
from src.tipoIncidente import exceptions, models, schemas


def _validar_duplicados(
    db: Session, nombre: str, excluir_id: int | None = None
) -> None:
    query = select(models.TipoIncidente).where(
        func.lower(models.TipoIncidente.nombre) == nombre.strip().lower()
    )
    if excluir_id is not None:
        query = query.where(models.TipoIncidente.id != excluir_id)
    if db.scalar(query) is not None:
        raise exceptions.TipoIncidenteDuplicado()


def crear_tipo_incidente(
    db: Session, tipo_incidente: schemas.TipoIncidenteCreate
) -> models.TipoIncidente:
    _validar_duplicados(db, tipo_incidente.nombre)
    _tipo_incidente = models.TipoIncidente(**tipo_incidente.model_dump())
    db.add(_tipo_incidente)
    db.commit()
    db.refresh(_tipo_incidente)
    return _tipo_incidente


def listar_tipos_incidente(
    db: Session,
    page: int = 1,
    size: int = 10,
    mostrar_inactivos: bool = False,
    ordenar_por: str = "id",
    orden: str = "asc",
    buscar: str = "",
) -> Dict[str, Any]:
    skip = (page - 1) * size
    query = select(models.TipoIncidente)
    if not mostrar_inactivos:
        query = query.where(models.TipoIncidente.activo == True)
    query = filtrar_ordenar(query, models.TipoIncidente, buscar, [models.TipoIncidente.nombre], ordenar_por, orden, {"id": models.TipoIncidente.id, "nombre": models.TipoIncidente.nombre, "color": models.TipoIncidente.color, "activo": models.TipoIncidente.activo})

    total = db.scalar(select(func.count()).select_from(query.subquery()))
    items = db.scalars(query.offset(skip).limit(size)).all()
    pages = (total + size - 1) // size if total else 0
    return {"items": items, "total": total, "page": page, "size": size, "pages": pages}


def leer_tipo_incidente(
    db: Session, tipo_incidente_id: int, incluir_inactivos: bool = False
) -> models.TipoIncidente:
    query = select(models.TipoIncidente).where(
        models.TipoIncidente.id == tipo_incidente_id
    )
    if not incluir_inactivos:
        query = query.where(models.TipoIncidente.activo == True)
    db_tipo_incidente = db.scalar(query)
    if db_tipo_incidente is None:
        raise exceptions.TipoIncidenteNoEncontrado()
    return db_tipo_incidente


def modificar_tipo_incidente(
    db: Session,
    tipo_incidente_id: int,
    tipo_incidente: schemas.TipoIncidenteUpdate,
) -> models.TipoIncidente:
    db_tipo_incidente = leer_tipo_incidente(
        db, tipo_incidente_id, incluir_inactivos=True
    )
    datos_actualizar = tipo_incidente.model_dump(exclude_unset=True)
    if datos_actualizar.get("nombre") is not None:
        _validar_duplicados(db, datos_actualizar["nombre"], excluir_id=tipo_incidente_id)
    db.execute(
        update(models.TipoIncidente)
        .where(models.TipoIncidente.id == tipo_incidente_id)
        .values(**datos_actualizar)
    )
    db.commit()
    db.refresh(db_tipo_incidente)
    return db_tipo_incidente


def eliminar_tipo_incidente(
    db: Session, tipo_incidente_id: int
) -> schemas.TipoIncidenteDelete:
    db_tipo_incidente = leer_tipo_incidente(db, tipo_incidente_id)
    db_tipo_incidente.activo = False
    db.commit()
    db.refresh(db_tipo_incidente)
    return db_tipo_incidente
