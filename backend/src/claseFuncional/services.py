from typing import Any

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from src.claseFuncional import exceptions, schemas
from src.claseFuncional.models import ClaseFuncional
from src.pagination import filtrar_ordenar


def _validar_duplicada(db: Session, nombre: str, excluir_id: int | None = None) -> None:
    query = select(ClaseFuncional.id).where(func.lower(ClaseFuncional.nombre) == nombre.strip().lower())
    if excluir_id is not None:
        query = query.where(ClaseFuncional.id != excluir_id)
    if db.scalar(query) is not None:
        raise exceptions.ClaseFuncionalDuplicada()


def crear_clase(db: Session, datos: schemas.ClaseFuncionalCreate) -> ClaseFuncional:
    _validar_duplicada(db, datos.nombre)
    clase = ClaseFuncional(**datos.model_dump())
    db.add(clase)
    db.commit()
    db.refresh(clase)
    return clase


def listar_clases(
    db: Session,
    page: int = 1,
    size: int = 10,
    mostrar_inactivos: bool = False,
    ordenar_por: str = "nombre",
    orden: str = "asc",
    buscar: str = "",
) -> dict[str, Any]:
    query = select(ClaseFuncional)
    if not mostrar_inactivos:
        query = query.where(ClaseFuncional.activo.is_(True))
    query = filtrar_ordenar(
        query, ClaseFuncional, buscar, [ClaseFuncional.nombre], ordenar_por, orden,
        {
            "id": ClaseFuncional.id,
            "nombre": ClaseFuncional.nombre,
            "ins_opcional": ClaseFuncional.ins_opcional,
            "activo": ClaseFuncional.activo,
        },
    )
    total = db.scalar(select(func.count()).select_from(query.subquery()))
    items = db.scalars(query.offset((page - 1) * size).limit(size)).all()
    pages = (total + size - 1) // size if total else 0
    return {"items": items, "total": total, "page": page, "size": size, "pages": pages}


def listar_clases_activas(db: Session) -> list[ClaseFuncional]:
    return list(
        db.scalars(select(ClaseFuncional).where(ClaseFuncional.activo.is_(True)).order_by(ClaseFuncional.nombre))
    )


def leer_clase(db: Session, clase_id: int) -> ClaseFuncional:
    clase = db.get(ClaseFuncional, clase_id)
    if clase is None:
        raise exceptions.ClaseFuncionalNoEncontrada()
    return clase


def modificar_clase(db: Session, clase_id: int, datos: schemas.ClaseFuncionalUpdate) -> ClaseFuncional:
    clase = leer_clase(db, clase_id)
    cambios = datos.model_dump(exclude_unset=True)
    if cambios.get("nombre") is not None:
        _validar_duplicada(db, cambios["nombre"], excluir_id=clase_id)
    for campo, valor in cambios.items():
        if valor is not None:
            setattr(clase, campo, valor)
    db.commit()
    db.refresh(clase)
    return clase


def eliminar_clase(db: Session, clase_id: int) -> ClaseFuncional:
    clase = leer_clase(db, clase_id)
    clase.activo = False
    db.commit()
    db.refresh(clase)
    return clase
