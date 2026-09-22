import logging
from typing import Any, Dict, List
from sqlalchemy import func, select, update
from sqlalchemy.orm import Session
from src.personal.models import Personal
from src.personal import schemas, exceptions

# Creamos un logger para este módulo específico. Más info.: https://docs.python.org/3/library/logging.html
logger = logging.getLogger(__name__)

# operaciones CRUD para Personas


def _validar_duplicados(
    db: Session, personal: schemas.PersonalBase, excluir_dni: int | None = None
) -> None:
    """Verifica que dni, nroLegajo y email no estén ya en uso por otro registro."""
    query_dni = select(Personal).where(Personal.dni == personal.dni)
    query_legajo = select(Personal).where(Personal.nroLegajo == personal.nroLegajo)
    query_email = select(Personal).where(Personal.email == personal.email)
    if excluir_dni is not None:
        query_dni = query_dni.where(Personal.dni != excluir_dni)
        query_legajo = query_legajo.where(Personal.dni != excluir_dni)
        query_email = query_email.where(Personal.dni != excluir_dni)

    if db.scalar(query_dni) is not None:
        raise exceptions.DniDuplicado()
    if db.scalar(query_legajo) is not None:
        raise exceptions.NroLegajoDuplicado()
    if db.scalar(query_email) is not None:
        raise exceptions.EmailDuplicado()


def crear_personal(db: Session, personal: schemas.PersonalCreate) -> schemas.Personal:
    _validar_duplicados(db, personal)
    _personal = Personal(**personal.model_dump())
    db.add(_personal)
    db.commit()
    db.refresh(_personal)
    return _personal


def listar_personal(
    db: Session, page: int = 1, size: int = 10, mostrar_inactivos: bool = False
) -> Dict[str, Any]:
    skip = (page - 1) * size
    query = select(Personal)

    if not mostrar_inactivos:
        query = query.where(Personal.activo == True)

    total = db.scalar(select(func.count()).select_from(query.subquery()))

    items = db.scalars(query.offset(skip).limit(size)).all()

    pages = (total + size - 1) // size if total else 0

    return {
        "items": items,
        "total": total,
        "page": page,
        "size": size,
        "pages": pages
    }


def leer_personal(
    db: Session, personal_id: int, incluir_inactivos: bool = False
) -> schemas.Personal:
    """Busca a una persona. Si incluir_inactivos es False, solo trae personal activo."""
    query = select(Personal).where(Personal.dni == personal_id)
    if not incluir_inactivos:
        query = query.where(Personal.activo == True)

    db_persona = db.scalar(query)
    if db_persona is None:
        raise exceptions.PersonalNoEncontrado()
    return db_persona


def modificar_personal(
    db: Session, personal_id: int, personal: schemas.PersonalUpdate
) -> Personal:
    # Pasamos incluir_inactivos=True para poder recuperar y reactivar a la persona.
    db_persona = leer_personal(db, personal_id, incluir_inactivos=True)
    _validar_duplicados(db, personal, excluir_dni=personal_id)
    db.execute(
        update(Personal)
        .where(Personal.dni == personal_id)
        .values(**personal.model_dump(exclude_unset=True))
    )
    db.commit()
    db.refresh(db_persona)
    return db_persona


def eliminar_personal(db: Session, personal_id: int) -> schemas.Personal:
    db_persona = leer_personal(db, personal_id)
    if len(db_persona.documentos) > 0:
        raise exceptions.PersonalTieneDocumentacion()
    db_persona.activo = False
    db.commit()
    db.refresh(db_persona)
    return db_persona
