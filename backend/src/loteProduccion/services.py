from datetime import date
from typing import Any, Dict

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from src.loteProduccion import exceptions, schemas
from src.loteProduccion.constants import PREFIJO_CODIGO
from src.loteProduccion.models import LoteProduccion
from src.pagination import filtrar_ordenar
from src.producto.models import Producto
from src.producto.services import leer_producto


def _validar_fecha(fecha: date) -> None:
    if fecha > date.today():
        raise exceptions.FechaFutura()


def _validar_producto(db: Session, producto_id: int, producto_actual_id: int | None = None) -> None:
    producto = leer_producto(db, producto_id, incluir_inactivos=True)
    if not producto.activo and producto.id != producto_actual_id:
        raise exceptions.ProductoInactivo()


def _generar_codigo(db: Session, fecha: date) -> str:
    prefijo = f"{PREFIJO_CODIGO}-{fecha:%Y%m%d}-"
    existentes = db.scalar(
        select(func.count()).select_from(LoteProduccion).where(LoteProduccion.codigo.like(f"{prefijo}%"))
    )
    numero = existentes + 1
    while db.scalar(select(LoteProduccion.id).where(LoteProduccion.codigo == f"{prefijo}{numero:03d}")):
        numero += 1
    return f"{prefijo}{numero:03d}"


def crear_lote(db: Session, lote: schemas.LoteProduccionCreate, registrado_por_id: int) -> LoteProduccion:
    _validar_producto(db, lote.producto_id)
    _validar_fecha(lote.fecha_produccion)
    db_lote = LoteProduccion(
        **lote.model_dump(),
        codigo=_generar_codigo(db, lote.fecha_produccion),
        registrado_por_id=registrado_por_id,
    )
    db.add(db_lote)
    db.commit()
    db.refresh(db_lote)
    return db_lote


def listar_lotes(
    db: Session,
    page: int = 1,
    size: int = 10,
    mostrar_inactivos: bool = False,
    ordenar_por: str = "fecha_produccion",
    orden: str = "desc",
    buscar: str = "",
    producto_id: int | None = None,
    fecha_desde: date | None = None,
    fecha_hasta: date | None = None,
    registrado_por_id: int | None = None,
) -> Dict[str, Any]:
    if fecha_desde and fecha_hasta and fecha_desde > fecha_hasta:
        raise exceptions.RangoFechasInvalido()
    query = select(LoteProduccion).join(Producto, LoteProduccion.producto_id == Producto.id)
    if not mostrar_inactivos:
        query = query.where(LoteProduccion.activo.is_(True))
    if producto_id is not None:
        query = query.where(LoteProduccion.producto_id == producto_id)
    if fecha_desde is not None:
        query = query.where(LoteProduccion.fecha_produccion >= fecha_desde)
    if fecha_hasta is not None:
        query = query.where(LoteProduccion.fecha_produccion <= fecha_hasta)
    if registrado_por_id is not None:
        query = query.where(LoteProduccion.registrado_por_id == registrado_por_id)
    query = filtrar_ordenar(
        query,
        LoteProduccion,
        buscar,
        [LoteProduccion.codigo, Producto.nombre],
        ordenar_por,
        orden,
        {
            "id": LoteProduccion.id,
            "codigo": LoteProduccion.codigo,
            "producto": Producto.nombre,
            "fecha_produccion": LoteProduccion.fecha_produccion,
            "cantidad": LoteProduccion.cantidad,
            "fecha_registro": LoteProduccion.fecha_registro,
        },
    )
    total = db.scalar(select(func.count()).select_from(query.subquery()))
    items = db.scalars(query.offset((page - 1) * size).limit(size)).all()
    pages = (total + size - 1) // size if total else 0
    return {"items": items, "total": total, "page": page, "size": size, "pages": pages}


def leer_lote(db: Session, lote_id: int) -> LoteProduccion:
    db_lote = db.scalar(select(LoteProduccion).where(LoteProduccion.id == lote_id))
    if db_lote is None:
        raise exceptions.LoteNoEncontrado()
    return db_lote


def modificar_lote(db: Session, lote_id: int, lote: schemas.LoteProduccionUpdate) -> LoteProduccion:
    db_lote = leer_lote(db, lote_id)
    datos = lote.model_dump(exclude_unset=True)
    if datos.get("producto_id") is not None:
        _validar_producto(db, datos["producto_id"], producto_actual_id=db_lote.producto_id)
    if datos.get("fecha_produccion") is not None:
        _validar_fecha(datos["fecha_produccion"])
    for campo, valor in datos.items():
        setattr(db_lote, campo, valor)
    db.commit()
    db.refresh(db_lote)
    return db_lote


def eliminar_lote(db: Session, lote_id: int) -> LoteProduccion:
    db_lote = leer_lote(db, lote_id)
    db_lote.activo = False
    db.commit()
    db.refresh(db_lote)
    return db_lote
