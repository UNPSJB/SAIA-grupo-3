from typing import Any, Dict
from sqlalchemy import func, select, update
from sqlalchemy.orm import Session
from src.tipoDocumento import exceptions, models, schemas


def _validar_duplicados(
    db: Session, nombre: str, excluir_id: int | None = None
) -> None:
    query = select(models.TipoDocumento).where(
        func.lower(models.TipoDocumento.nombre) == nombre.strip().lower()
    )
    if excluir_id is not None:
        query = query.where(models.TipoDocumento.id != excluir_id)
    if db.scalar(query) is not None:
        raise exceptions.TipoDocumentoDuplicado()


def crear_tipo_documento(
    db: Session, tipo_documento: schemas.TipoDocumentoCreate
) -> models.TipoDocumento:
    _validar_duplicados(db, tipo_documento.nombre)
    _tipo_documento = models.TipoDocumento(**tipo_documento.model_dump())
    db.add(_tipo_documento)
    db.commit()
    db.refresh(_tipo_documento)
    return _tipo_documento


def listar_tipos_documento(
    db: Session,
    page: int = 1,
    size: int = 10,
    mostrar_inactivos: bool = False,
    ordenar_por: str = "id",
    orden: str = "asc",
    buscar: str = "",
) -> Dict[str, Any]:
    skip = (page - 1) * size
    query = select(models.TipoDocumento)
    if not mostrar_inactivos:
        query = query.where(models.TipoDocumento.activo == True)
    if buscar.strip():
        termino = f"%{buscar.strip().lower()}%"
        query = query.where(func.lower(models.TipoDocumento.nombre).like(termino))

    columna_orden = getattr(models.TipoDocumento, ordenar_por, models.TipoDocumento.id)
    if orden == "desc":
        query = query.order_by(columna_orden.desc())
    else:
        query = query.order_by(columna_orden.asc())

    total = db.scalar(select(func.count()).select_from(query.subquery()))
    items = db.scalars(query.offset(skip).limit(size)).all()
    pages = (total + size - 1) // size if total else 0
    return {"items": items, "total": total, "page": page, "size": size, "pages": pages}


def leer_tipo_documento(
    db: Session, tipo_documento_id: int, incluir_inactivos: bool = False
) -> models.TipoDocumento:
    query = select(models.TipoDocumento).where(
        models.TipoDocumento.id == tipo_documento_id
    )
    if not incluir_inactivos:
        query = query.where(models.TipoDocumento.activo == True)
    db_tipo_documento = db.scalar(query)
    if db_tipo_documento is None:
        raise exceptions.TipoDocumentoNoEncontrado()
    return db_tipo_documento


def modificar_tipo_documento(
    db: Session,
    tipo_documento_id: int,
    tipo_documento: schemas.TipoDocumentoUpdate,
) -> models.TipoDocumento:
    db_tipo_documento = leer_tipo_documento(
        db, tipo_documento_id, incluir_inactivos=True
    )
    datos_actualizar = tipo_documento.model_dump(exclude_unset=True)
    if datos_actualizar.get("nombre") is not None:
        _validar_duplicados(db, datos_actualizar["nombre"], excluir_id=tipo_documento_id)
    db.execute(
        update(models.TipoDocumento)
        .where(models.TipoDocumento.id == tipo_documento_id)
        .values(**datos_actualizar)
    )
    db.commit()
    db.refresh(db_tipo_documento)
    return db_tipo_documento


def eliminar_tipo_documento(
    db: Session, tipo_documento_id: int
) -> schemas.TipoDocumentoDelete:
    db_tipo_documento = leer_tipo_documento(db, tipo_documento_id)
    db_tipo_documento.activo = False
    db.commit()
    db.refresh(db_tipo_documento)
    return db_tipo_documento
