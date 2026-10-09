from typing import Any, Dict, Optional
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload
from src.documentoTecnico import exceptions, schemas
from src.documentoTecnico.models import (
    DocumentoTecnico, VersionDocumentoTecnico, EstadoDocumento, TipoDocumentoTecnico,
)
from src.personal.models import Personal


def listar_documentos(
    db: Session,
    page: int = 1,
    size: int = 10,
    estado: Optional[EstadoDocumento] = None,
    tipo: Optional[TipoDocumentoTecnico] = None,
    busqueda: Optional[str] = None,
) -> Dict[str, Any]:
    skip = (page - 1) * size
    query = select(DocumentoTecnico)

    if estado is not None:
        query = query.where(DocumentoTecnico.estado == estado)
    if tipo is not None:
        query = query.where(DocumentoTecnico.tipo == tipo)
    if busqueda and busqueda.strip():
        query = query.where(DocumentoTecnico.nombre.ilike(f"%{busqueda.strip()}%"))

    total = db.scalar(select(func.count()).select_from(query.subquery()))
    items = db.scalars(
        query.options(selectinload(DocumentoTecnico.versiones))   # trae las versiones en 1 sola consulta
        .order_by(DocumentoTecnico.nombre)
        .offset(skip).limit(size)
    ).all()
    pages = (total + size - 1) // size if total else 0
    return {"items": items, "total": total, "page": page, "size": size, "pages": pages}


def leer_documento(db: Session, documento_id: int) -> DocumentoTecnico:
    documento = db.get(DocumentoTecnico, documento_id)
    if documento is None:
        raise exceptions.DocumentoTecnicoNoEncontrado()
    return documento


def leer_version(db: Session, version_id: int) -> VersionDocumentoTecnico:
    version = db.get(VersionDocumentoTecnico, version_id)
    if version is None:
        raise exceptions.VersionNoEncontrada()
    return version


def _nueva_version(
    datos_archivo: dict, numero: int, comentario: Optional[str], personal: Personal
) -> VersionDocumentoTecnico:
    return VersionDocumentoTecnico(
        **datos_archivo, 
        numero=numero,
        estado=EstadoDocumento.VIGENTE,
        comentario=comentario,
        subido_por_id=personal.id,
    )


def crear_documento(
    db: Session, datos: schemas.DocumentoTecnicoBase, datos_archivo: dict, personal: Personal
) -> DocumentoTecnico:
    documento = DocumentoTecnico(**datos.model_dump())
    documento.versiones.append(_nueva_version(datos_archivo, 1, "Versión inicial", personal))
    db.add(documento)
    db.commit()
    db.refresh(documento)
    return documento


def subir_nueva_version(
    db: Session, documento_id: int, datos_archivo: dict, comentario: Optional[str], personal: Personal
) -> DocumentoTecnico:
    documento = leer_documento(db, documento_id)
    if documento.estado == EstadoDocumento.ARCHIVADO:
        raise exceptions.DocumentoArchivado()

    siguiente = max((v.numero for v in documento.versiones), default=0) + 1
    for version in documento.versiones:
        if version.estado == EstadoDocumento.VIGENTE:
            version.estado = EstadoDocumento.ARCHIVADO
    documento.versiones.append(_nueva_version(datos_archivo, siguiente, comentario, personal))
    db.commit()   # el archivado y la versión nueva se guardan juntos, o ninguno
    db.refresh(documento)
    return documento


def modificar_documento(
    db: Session, documento_id: int, datos: schemas.DocumentoTecnicoBase
) -> DocumentoTecnico:
    documento = leer_documento(db, documento_id)
    for campo, valor in datos.model_dump().items():
        setattr(documento, campo, valor)
    db.commit()
    db.refresh(documento)
    return documento


def cambiar_estado(db: Session, documento_id: int, estado: EstadoDocumento) -> DocumentoTecnico:
    documento = leer_documento(db, documento_id)
    documento.estado = estado
    db.commit()
    db.refresh(documento)
    return documento
