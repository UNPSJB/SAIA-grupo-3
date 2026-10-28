from typing import Any, Dict

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from src.pagination import filtrar_ordenar
from src.producto import exceptions, schemas
from src.producto.models import Producto
from src.unidadMedida.services import leer_unidad_medida


def _validar_duplicados(db: Session, nombre: str, excluir_id: int | None = None) -> None:
    query = select(Producto).where(func.lower(Producto.nombre) == nombre.strip().lower())
    if excluir_id is not None:
        query = query.where(Producto.id != excluir_id)
    if db.scalar(query) is not None:
        raise exceptions.NombreDuplicado()


def crear_producto(db: Session, producto: schemas.ProductoCreate) -> Producto:
    _validar_duplicados(db, producto.nombre)
    leer_unidad_medida(db, producto.unidad_medida_id)
    db_producto = Producto(**producto.model_dump())
    db.add(db_producto)
    db.commit()
    db.refresh(db_producto)
    return db_producto


def listar_productos(
    db: Session,
    page: int = 1,
    size: int = 10,
    mostrar_inactivos: bool = False,
    ordenar_por: str = "nombre",
    orden: str = "asc",
    buscar: str = "",
) -> Dict[str, Any]:
    query = select(Producto)
    if not mostrar_inactivos:
        query = query.where(Producto.activo.is_(True))
    query = filtrar_ordenar(
        query,
        Producto,
        buscar,
        [Producto.nombre, Producto.descripcion],
        ordenar_por,
        orden,
        {"id": Producto.id, "nombre": Producto.nombre, "activo": Producto.activo},
    )
    total = db.scalar(select(func.count()).select_from(query.subquery()))
    items = db.scalars(query.offset((page - 1) * size).limit(size)).all()
    pages = (total + size - 1) // size if total else 0
    return {"items": items, "total": total, "page": page, "size": size, "pages": pages}


def listar_productos_activos(db: Session) -> list[Producto]:
    return list(
        db.scalars(
            select(Producto).where(Producto.activo.is_(True)).order_by(Producto.nombre)
        ).all()
    )


def leer_producto(db: Session, producto_id: int, incluir_inactivos: bool = False) -> Producto:
    query = select(Producto).where(Producto.id == producto_id)
    if not incluir_inactivos:
        query = query.where(Producto.activo.is_(True))
    db_producto = db.scalar(query)
    if db_producto is None:
        raise exceptions.ProductoNoEncontrado()
    return db_producto


def modificar_producto(db: Session, producto_id: int, producto: schemas.ProductoUpdate) -> Producto:
    db_producto = leer_producto(db, producto_id, incluir_inactivos=True)
    datos = producto.model_dump(exclude_unset=True)
    if datos.get("nombre") is not None:
        _validar_duplicados(db, datos["nombre"], excluir_id=producto_id)
    if datos.get("unidad_medida_id") is not None:
        leer_unidad_medida(db, datos["unidad_medida_id"])
    for campo, valor in datos.items():
        setattr(db_producto, campo, valor)
    db.commit()
    db.refresh(db_producto)
    return db_producto


def eliminar_producto(db: Session, producto_id: int) -> Producto:
    db_producto = leer_producto(db, producto_id)
    db_producto.activo = False
    db.commit()
    db.refresh(db_producto)
    return db_producto
