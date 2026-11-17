from typing import Iterable

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from src.alergeno import exceptions, schemas
from src.alergeno.models import Alergeno


def _validar_duplicado(db: Session, nombre: str, excluir_id: int | None = None) -> None:
    query = select(Alergeno.id).where(func.lower(Alergeno.nombre) == nombre.strip().lower())
    if excluir_id is not None:
        query = query.where(Alergeno.id != excluir_id)
    if db.scalar(query) is not None:
        raise exceptions.AlergenoDuplicado()


def listar(db: Session, mostrar_inactivos: bool = False) -> list[Alergeno]:
    query = select(Alergeno).order_by(Alergeno.orden, Alergeno.nombre)
    if not mostrar_inactivos:
        query = query.where(Alergeno.activo.is_(True))
    return list(db.scalars(query))


def leer(db: Session, alergeno_id: int) -> Alergeno:
    alergeno = db.get(Alergeno, alergeno_id)
    if alergeno is None:
        raise exceptions.AlergenoNoEncontrado()
    return alergeno


def crear(db: Session, datos: schemas.AlergenoCreate) -> Alergeno:
    _validar_duplicado(db, datos.nombre)
    alergeno = Alergeno(**datos.model_dump())
    db.add(alergeno)
    db.commit()
    db.refresh(alergeno)
    return alergeno


def modificar(db: Session, alergeno_id: int, datos: schemas.AlergenoUpdate) -> Alergeno:
    alergeno = leer(db, alergeno_id)
    cambios = datos.model_dump(exclude_unset=True)
    if cambios.get("nombre"):
        _validar_duplicado(db, cambios["nombre"], excluir_id=alergeno_id)
    for campo, valor in cambios.items():
        if valor is not None or campo == "descripcion":
            setattr(alergeno, campo, valor)
    db.commit()
    db.refresh(alergeno)
    return alergeno


def desactivar(db: Session, alergeno_id: int) -> Alergeno:
    alergeno = leer(db, alergeno_id)
    alergeno.activo = False
    db.commit()
    db.refresh(alergeno)
    return alergeno


def resolver(db: Session, ids: Iterable[int], actuales: Iterable[Alergeno] = ()) -> list[Alergeno]:
    unicos = list(dict.fromkeys(ids))
    if not unicos:
        return []
    asignados = {alergeno.id for alergeno in actuales}
    alergenos = list(db.scalars(select(Alergeno).where(Alergeno.id.in_(unicos))))
    validos = [alergeno for alergeno in alergenos if alergeno.activo or alergeno.id in asignados]
    if len(validos) != len(unicos):
        raise exceptions.AlergenosInvalidos()
    return validos
