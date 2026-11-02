from datetime import date, timedelta

from fastapi import HTTPException
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from src.loteProduccion.models import LoteProduccion
from src.producto.models import Producto
from src.unidadMedida.models import UnidadMedida


class ProductoEstadistica(BaseModel):
    id: int
    nombre: str
    unidad_medida_id: int
    unidad: str


class PuntoProduccion(BaseModel):
    fecha: date
    cantidad: float


class SerieProduccion(BaseModel):
    producto: ProductoEstadistica
    total: float
    puntos: list[PuntoProduccion]


class EstadisticaProduccion(BaseModel):
    desde: date
    hasta: date
    productos: list[ProductoEstadistica]
    series: list[SerieProduccion]


def calcular_produccion(
    db: Session,
    fecha_desde: date | None = None,
    fecha_hasta: date | None = None,
    producto_id: int | None = None,
) -> EstadisticaProduccion:
    hasta = fecha_hasta or date.today()
    desde = fecha_desde or hasta - timedelta(days=29)
    if desde > hasta:
        raise HTTPException(400, "La fecha desde no puede ser posterior a la fecha hasta.")
    if (hasta - desde).days > 365:
        raise HTTPException(400, "Seleccioná un rango de hasta 366 días.")

    # Incluye productos dados de baja: su producción histórica sigue siendo válida.
    productos = [
        ProductoEstadistica(id=id_, nombre=nombre, unidad_medida_id=unidad_id, unidad=sufijo)
        for id_, nombre, unidad_id, sufijo in db.execute(
            select(Producto.id, Producto.nombre, Producto.unidad_medida_id, UnidadMedida.sufijo)
            .join(UnidadMedida, Producto.unidad_medida_id == UnidadMedida.id)
            .order_by(Producto.nombre, Producto.id)
        ).all()
    ]
    if producto_id is not None and not any(p.id == producto_id for p in productos):
        raise HTTPException(404, "El producto seleccionado no existe.")
    consulta = (
        select(LoteProduccion.producto_id, LoteProduccion.fecha_produccion,
               func.sum(LoteProduccion.cantidad))
        .where(LoteProduccion.activo.is_(True),
               LoteProduccion.fecha_produccion >= desde,
               LoteProduccion.fecha_produccion <= hasta)
        .group_by(LoteProduccion.producto_id, LoteProduccion.fecha_produccion)
        .order_by(LoteProduccion.fecha_produccion)
    )
    if producto_id is not None:
        consulta = consulta.where(LoteProduccion.producto_id == producto_id)
    puntos: dict[int, list[PuntoProduccion]] = {}
    for id_, fecha, cantidad in db.execute(consulta).all():
        puntos.setdefault(id_, []).append(PuntoProduccion(fecha=fecha, cantidad=float(cantidad)))
    return EstadisticaProduccion(
        desde=desde, hasta=hasta, productos=productos,
        series=[SerieProduccion(producto=p, puntos=puntos[p.id],
                                total=sum(x.cantidad for x in puntos[p.id]))
                for p in productos if p.id in puntos],
    )