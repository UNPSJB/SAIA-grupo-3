import logging
from typing import Any, Dict, List
from sqlalchemy import func, select, update
from sqlalchemy.orm import Session
from src.personal.models import Personal
from src.personal import schemas, exceptions
from src.auth.utils import get_password_hash # CORRECCIÓN 1: Faltaba esta importación

logger = logging.getLogger(__name__)

def _validar_duplicados(
    db: Session, personal: schemas.PersonalBase, excluir_id: int | None = None
) -> None:
    """Verifica que dni, nroLegajo, email y username no estén ya en uso."""
    query_dni = select(Personal).where(Personal.dni == personal.dni)
    query_legajo = select(Personal).where(Personal.nroLegajo == personal.nroLegajo)
    query_email = select(Personal).where(Personal.email == personal.email)
    query_username = select(Personal).where(Personal.username == personal.username)
    
    if excluir_id is not None:
        query_dni = query_dni.where(Personal.id != excluir_id) # CORRECCIÓN 2: Era ID, no DNI
        query_legajo = query_legajo.where(Personal.id != excluir_id)
        query_email = query_email.where(Personal.id != excluir_id)
        query_username = query_username.where(Personal.id != excluir_id)

    if db.scalar(query_dni) is not None:
        raise exceptions.DniDuplicado()
    if db.scalar(query_legajo) is not None:
        raise exceptions.NroLegajoDuplicado()
    if db.scalar(query_email) is not None:
        raise exceptions.EmailDuplicado()
    if db.scalar(query_username) is not None:
        raise exceptions.UsernameDuplicado()

def crear_personal(db: Session, personal: schemas.PersonalCreate) -> Personal:
    _validar_duplicados(db, personal) # CORRECCIÓN: Código simplificado llamando a la función
    
    datos = personal.model_dump()
    password = datos.pop("password")
    hashed_password = get_password_hash(password)

    _personal = Personal(**datos, hashed_password=hashed_password, activo=True)
    db.add(_personal)
    db.commit()
    db.refresh(_personal)
    return _personal


def leer_personal_por_email(db: Session, email: str):
    db_personal = db.scalar(select(Personal).where(Personal.email == email))
    if not db_personal:
        raise exceptions.PersonalNoEncontrado()
    return db_personal

def leer_personal_por_dni(db: Session, dni: int):
    # DNI es string en tu DB, así que lo parseamos a str
    db_personal = db.scalar(select(Personal).where(Personal.dni == str(dni)))
    if not db_personal:
        raise exceptions.PersonalNoEncontrado()
    return db_personal

def leer_personal_por_username(db: Session, username: str):
    db_personal = db.scalar(select(Personal).where(Personal.username == username))
    if not db_personal:
        raise exceptions.PersonalNoEncontrado()
    return db_personal


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


def leer_personal(db: Session, personal_id: int, incluir_inactivos: bool = False) -> Personal:
    query = select(Personal).where(Personal.id == personal_id)
    if not incluir_inactivos:
        query = query.where(Personal.activo == True)
        
    db_personal = db.scalar(query)
    if db_personal is None:
        raise exceptions.PersonalNoEncontrado()
    return db_personal


def modificar_personal(
    db: Session, personal_id: int, personal: schemas.PersonalUpdate
) -> Personal:
    db_persona = leer_personal(db, personal_id, incluir_inactivos=True)
    _validar_duplicados(db, personal, excluir_id=personal_id)
    
    # CORRECCIÓN 3: Soportamos si en el PUT te mandan una nueva contraseña
    valores = personal.model_dump(exclude_unset=True)
    if "password" in valores:
        password = valores.pop("password")
        if password and password.strip():
            valores["hashed_password"] = get_password_hash(password)

    db.execute(
        update(Personal)
        .where(Personal.id == personal_id) # CORRECCIÓN 4: Acá decía Personal.dni, iba a explotar
        .values(**valores)
    )
    db.commit()
    db.refresh(db_persona)
    return db_persona


def eliminar_personal(db: Session, personal_id: int) -> Personal:
    db_persona = leer_personal(db, personal_id)
    if len(db_persona.documentos) > 0:
        raise exceptions.PersonalTieneDocumentacion()
    db_persona.activo = False
    db.commit()
    db.refresh(db_persona)
    return db_persona