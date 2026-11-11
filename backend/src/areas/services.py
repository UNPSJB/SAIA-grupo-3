from collections.abc import Iterable

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from src.areas import exceptions
from src.insumos.models import Insumo
from src.insumosQuimicos.models import InsumoQuimico


def _normalizar(nombre: str) -> str:
    return nombre.strip().lower()


def validar_nombre_de_ingrediente(db: Session, nombre: str) -> None:
    existe = db.scalar(
        select(InsumoQuimico.id).where(func.lower(InsumoQuimico.nombre) == _normalizar(nombre)).limit(1)
    )
    if existe is not None:
        raise exceptions.NombreUsadoPorInsumoQuimico()


def validar_nombre_de_insumo_quimico(db: Session, nombre: str) -> None:
    existe = db.scalar(
        select(Insumo.id).where(func.lower(Insumo.nombre) == _normalizar(nombre)).limit(1)
    )
    if existe is not None:
        raise exceptions.NombreUsadoPorIngrediente()


def obtener_ingredientes(db: Session, ids: Iterable[int]) -> dict[int, Insumo]:
    ids_pedidos = set(ids)
    if not ids_pedidos:
        return {}
    ingredientes = {
        insumo.id: insumo
        for insumo in db.scalars(select(Insumo).where(Insumo.id.in_(ids_pedidos))).all()
    }
    if set(ingredientes) != ids_pedidos:
        raise exceptions.NoEsIngrediente()
    return ingredientes
