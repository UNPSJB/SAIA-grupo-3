import logging
from typing import List
from sqlalchemy import delete, select, update
from sqlalchemy.orm import Session
from src.personal.models import Personal
from src.personal import schemas, exceptions

# Creamos un logger para este módulo específico. Más info.: https://docs.python.org/3/library/logging.html
logger = logging.getLogger(__name__)

# operaciones CRUD para Personas

def crear_personal(db: Session, personal: schemas.PersonalCreate) -> schemas.Personal:
    _personal = personal(**personal.model_dump())
    db.add(_personal)
    db.commit()
    db.refresh(_personal)
    return _personal


def listar_personal(db: Session) -> List[schemas.Personal]:
    logger.info("Listando personal desde services")  # <- este mensaje se verá por la terminal
    return db.scalars(select(Personal)).all()


def leer_personal(db: Session, personal_id: int) -> schemas.Personal:
    db_persona = db.scalar(select(Personal).where(Personal.id == personal_id))
    if db_persona is None:
        raise exceptions.PersonalNoEncontrado()
    return db_persona


def modificar_personal(
    db: Session, personal_id: int, personal: schemas.PersonalUpdate
) -> Personal:
    db_persona = leer_personal(db, personal_id)
    db.execute(
        update(Personal).where(Personal.id == personal_id).values(**personal.model_dump())
    )
    db.commit()
    db.refresh(db_persona)
    return db_persona


def eliminar_personal(db: Session, personal_id: int) -> schemas.Personal:
    db_persona = leer_personal(db, personal_id)
    if len(db_persona.documentos) > 0:
        raise exceptions.PersonalTieneDocumentacion()
    db.execute(delete(Personal).where(Personal.id == personal_id))
    db.commit()
    return db_persona
