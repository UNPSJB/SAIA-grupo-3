from datetime import date

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from src.auth.utils import get_password_hash, password_hash
from src.documentacion.models import Documentacion
from src.documentacion.vencimientos import calcular_estado
from src.perfil import exceptions, schemas
from src.personal.models import Personal


def listar_documentacion(db: Session, personal: Personal, hoy: date | None = None) -> list[schemas.DocumentoPerfil]:
    hoy = hoy or date.today()
    documentos = db.scalars(
        select(Documentacion)
        .where(Documentacion.personal_id == personal.id)
        .order_by(Documentacion.fecha_vencimiento.is_(None), Documentacion.fecha_vencimiento, Documentacion.id)
    ).all()
    return [
        schemas.DocumentoPerfil(
            id=documento.id,
            tipo_documento=documento.tipo_documento,
            fecha_vencimiento=documento.fecha_vencimiento,
            estado=calcular_estado(documento.fecha_vencimiento, hoy) if documento.fecha_vencimiento else None,
            dias_restantes=(documento.fecha_vencimiento - hoy).days if documento.fecha_vencimiento else None,
        )
        for documento in documentos
    ]


def cambiar_password(db: Session, personal: Personal, datos: schemas.CambioPassword) -> None:
    if not password_hash.verify(datos.password_actual, personal.hashed_password):
        raise exceptions.PasswordActualIncorrecta()
    if datos.password_nueva == datos.password_actual:
        raise exceptions.PasswordIgualALaActual()
    personal.hashed_password = get_password_hash(datos.password_nueva)
    db.commit()


def actualizar_perfil(db: Session, personal: Personal, datos: schemas.PerfilUpdate) -> Personal:
    email = datos.email.strip().lower()
    duplicado = db.scalar(
        select(Personal.id).where(func.lower(Personal.email) == email, Personal.id != personal.id)
    )
    if duplicado is not None:
        raise exceptions.EmailDuplicado()
    personal.email = email
    db.commit()
    db.refresh(personal)
    return personal
