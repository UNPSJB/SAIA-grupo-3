from typing import Any, Dict, Optional
from sqlalchemy import func, select, update
from sqlalchemy.orm import Session, selectinload
from src.documentoTecnico import exceptions, schemas
from src.documentoTecnico.models import (
    DocumentoTecnico, VersionDocumentoTecnico, EstadoDocumento, TipoDocumentoTecnico,
    CambioVigenciaDocumentoTecnico,
)
from src.personal.models import Personal
from src.pagination import filtrar_ordenar


def listar_documentos(
    db: Session,
    page: int = 1,
    size: int = 10,
    estado: Optional[EstadoDocumento] = None,
    tipo: Optional[TipoDocumentoTecnico] = None,
    busqueda: Optional[str] = None,
    ordenar_por: str = "nombre",
    orden: str = "asc",
) -> Dict[str, Any]:
    skip = (page - 1) * size
    query = select(DocumentoTecnico)

    if estado is not None:
        query = query.where(DocumentoTecnico.estado == estado)
    if tipo is not None:
        query = query.where(DocumentoTecnico.tipo == tipo)
    def campo_version(campo):
        return select(campo).where(
            VersionDocumentoTecnico.documento_id == DocumentoTecnico.id,
            VersionDocumentoTecnico.estado == EstadoDocumento.VIGENTE,
        ).correlate(DocumentoTecnico).scalar_subquery()

    query = filtrar_ordenar(
        query, DocumentoTecnico, busqueda or "", [DocumentoTecnico.nombre],
        ordenar_por, orden, {
            "nombre": DocumentoTecnico.nombre,
            "tipo": DocumentoTecnico.tipo,
            "version_vigente": campo_version(VersionDocumentoTecnico.numero),
            "ultima_actualizacion": campo_version(VersionDocumentoTecnico.fecha_subida),
        },
    )

    total = db.scalar(select(func.count()).select_from(query.subquery()))
    items = db.scalars(
        query.options(
            selectinload(DocumentoTecnico.versiones),
            selectinload(DocumentoTecnico.cambios_vigencia).selectinload(CambioVigenciaDocumentoTecnico.personal),
        )   # trae las versiones en 1 sola consulta
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


def _bloquear_documento(db: Session, documento_id: int) -> DocumentoTecnico:
    # La escritura sin cambios toma el bloqueo antes de leer las versiones.
    # SQLite no implementa SELECT FOR UPDATE; la transacción mantiene este bloqueo.
    db.execute(
        update(DocumentoTecnico).where(DocumentoTecnico.id == documento_id)
        .values(id=DocumentoTecnico.id).execution_options(synchronize_session=False)
    )
    db.expire_all()
    return leer_documento(db, documento_id)


def _activar_version(
    db: Session, documento: DocumentoTecnico, elegida: VersionDocumentoTecnico, personal: Personal
) -> None:
    anterior = documento.version_vigente
    for version in documento.versiones:
        version.estado = EstadoDocumento.VIGENTE if version is elegida else EstadoDocumento.ARCHIVADO
    db.flush()
    documento.cambios_vigencia.append(CambioVigenciaDocumentoTecnico(
        version_anterior_id=anterior.id if anterior else None,
        version_id=elegida.id,
        personal_id=personal.id,
    ))


def crear_documento(
    db: Session, datos: schemas.DocumentoTecnicoBase, datos_archivo: dict, personal: Personal
) -> DocumentoTecnico:
    try:
        documento = DocumentoTecnico(**datos.model_dump())
        version = _nueva_version(datos_archivo, 1, "Versión inicial", personal)
        # Todavía no estuvo vigente: la activación inicial no tiene versión anterior.
        version.estado = EstadoDocumento.ARCHIVADO
        documento.versiones.append(version)
        db.add(documento)
        _activar_version(db, documento, version, personal)
        db.commit()
        db.refresh(documento)
        return documento
    except Exception:
        db.rollback()
        raise


def subir_nueva_version(
    db: Session, documento_id: int, datos_archivo: dict, comentario: Optional[str], personal: Personal
) -> DocumentoTecnico:
    try:
        documento = _bloquear_documento(db, documento_id)
        if documento.estado == EstadoDocumento.ARCHIVADO:
            raise exceptions.DocumentoArchivado()
        siguiente = max((v.numero for v in documento.versiones), default=0) + 1
        nueva = _nueva_version(datos_archivo, siguiente, comentario, personal)
        nueva.estado = EstadoDocumento.ARCHIVADO
        documento.versiones.append(nueva)
        _activar_version(db, documento, nueva, personal)
        db.commit()
        db.refresh(documento)
        return documento
    except Exception:
        db.rollback()
        raise


def marcar_version_vigente(
    db: Session, documento_id: int, version_id: int, personal: Personal
) -> DocumentoTecnico:
    try:
        documento = _bloquear_documento(db, documento_id)
        if documento.estado == EstadoDocumento.ARCHIVADO:
            raise exceptions.DocumentoArchivado()
        elegida = next((v for v in documento.versiones if v.id == version_id), None)
        if elegida is None:
            raise exceptions.VersionNoEncontrada()
        if elegida.estado != EstadoDocumento.VIGENTE:
            _activar_version(db, documento, elegida, personal)
        db.commit()
        db.refresh(documento)
        return documento
    except Exception:
        db.rollback()
        raise


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
    documento = _bloquear_documento(db, documento_id)
    documento.estado = estado
    db.commit()
    db.refresh(documento)
    return documento
