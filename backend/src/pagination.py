
# backend/src/pagination.py
from typing import Generic, TypeVar, List
from pydantic import BaseModel

T = TypeVar("T")

class PaginatedResponse(BaseModel, Generic[T]):
    items: List[T]
    total: int
    page: int
    size: int
    pages: int

from sqlalchemy import String, cast, func, or_
from fastapi import HTTPException


def filtrar_ordenar(query, model, buscar, campos_busqueda, ordenar_por, orden, columnas):
    """Filtra antes de paginar y restringe el orden a columnas públicas."""
    if ordenar_por not in columnas or orden not in ("asc", "desc"):
        raise HTTPException(status_code=422, detail="Columna o dirección de orden inválida.")
    if buscar.strip():
        term = buscar.strip().lower().replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
        query = query.where(or_(*(func.lower(cast(column, String)).like(f"%{term}%", escape="\\") for column in campos_busqueda)))
    column = columnas[ordenar_por]
    query = query.order_by(None).order_by(column.desc() if orden == "desc" else column.asc())
    if ordenar_por != "id":
        query = query.order_by(model.id.asc())
    return query
