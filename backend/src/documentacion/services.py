from typing import List
from sqlalchemy import delete, select, update
from sqlalchemy.orm import Session
from src.documentacion.models import Documentacion
from src.documentacion import schemas, exceptions
from src.personal.models import Personal
from src.personal import exceptions as personal_exceptions


# operaciones CRUD para Documentos


def crear_documento(db: Session, documento: schemas.DocumentoCreate) -> schemas.Documento:
    personal = db.scalar(
        select(Personal).where(Personal.dni == documento.personal_id)
    )
    if personal is None:
        raise personal_exceptions.PersonalNoEncontrado()

    _documento = Documentacion(**documento.model_dump())
    db.add(_documento)
    db.commit()
    db.refresh(_documento)
    return _documento


def listar_documentos(
    db: Session, personal_id: int | None = None
) -> List[Documentacion]:
    query = select(Documentacion)
    if personal_id is not None:
        query = query.where(Documentacion.personal_id == personal_id)
    return db.scalars(query.order_by(Documentacion.id)).all()


def leer_documento(db: Session, documento_id: int) -> schemas.Documento:
    db_documento = db.scalar(select(Documentacion).where(Documentacion.id == documento_id))
    if db_documento is None:
        raise exceptions.DocumentoNoEncontrado() # <- usamos nuestras propias excepciones adaptadas al dominio de aplicación
    return db_documento


def modificar_documento(
    db: Session, documento_id: int, documento: schemas.DocumentoUpdate
) -> Documentacion:
    db_documento = leer_documento(db, documento_id)
    db.execute(
        update(Documentacion)
        .where(Documentacion.id == documento_id)
        .values(**documento.model_dump())
    )
    db.commit()
    db.refresh(db_documento)
    return db_documento


def eliminar_documento(db: Session, documento_id: int) -> schemas.DocumentoDelete:
    db_documento = leer_documento(db, documento_id)
    db.execute(
        delete(Documentacion).where(Documentacion.id == documento_id)
    )
    db.commit()
    return db_documento
