from typing import List
from sqlalchemy import delete, select, update
from sqlalchemy.orm import Session
from src.documentacion.models import Documento
from src.documentacion import schemas, exceptions


# operaciones CRUD para Mascota


def crear_documentacion(db: Session, Documento: schemas.DocumentoCreate) -> schemas.Mascota:
    _documento = Documento(**documento.model_dump())
    db.add(_documento)
    db.commit()
    db.refresh(
        _documento
    )  # <- qué hace refresh()?: https://docs.sqlalchemy.org/en/21/orm/session_api.html#sqlalchemy.orm.Session.refresh
    return _documento


def listar_documentos(db: Session) -> List[schemas.Documento]:
    return db.scalars(select(Documento)).all()


def leer_documento(db: Session, documento_id: int) -> schemas.Documento:
    db_documento = db.scalar(select(Documento).where(Documento.id == documento_id))
    if db_documento is None:
        raise exceptions.DocumentoNoEncontrado() # <- usamos nuestras propias excepciones adaptadas al dominio de aplicación
    return db_documento


def documento_mascota(
    db: Session, documento_id: int, documento: schemas.DocumentoUpdate
) -> Documento:
    db_docuento = leer_docuento(db, docuento_id)
    db.execute(update(Documento)
               .where(Documento.id == documento_id)
               .values(**documentos.model_dump()))
    db.commit()
    db.refresh(db_documento)
    return db_documento


def eliminar_documento(db: Session, documento_id: int) -> schemas.DocumentoDelete:
    db_documento = leer_documento(db, documento_id)
    db.execute(
        delete(Documento).where(Documento.id == documento_id)
    )
    db.commit()
    return db_documento
