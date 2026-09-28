import logging
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from src.database import get_db
from src.consumoQuimico import schemas, services
from src.pagination import PaginatedResponse
from typing import List
from datetime import date

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/consumos-quimicos", tags=["consumos_quimicos"])

@router.post("/", response_model=schemas.ConsumoQuimico)
def create_consumo(consumo: schemas.ConsumoQuimicoCreate, db: Session = Depends(get_db)):
    return services.crear_consumo(db, consumo)

@router.get("/", response_model=PaginatedResponse[schemas.ConsumoQuimico])
def read_consumos(
    db: Session = Depends(get_db),
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=100),
    mostrar_inactivos: bool = Query(False),
    ordenar_por: str = Query("fecha"),
    orden: str = Query("desc")
):
    return services.listar_consumos(db, page, size, mostrar_inactivos, ordenar_por, orden)

@router.get("/reporte/acumulado", response_model=List[schemas.ConsumoAcumulado])
def reporte_consumo_acumulado(
    db: Session = Depends(get_db),
    fecha_desde: date = Query(None, description="Fecha de inicio (YYYY-MM-DD)"),
    fecha_hasta: date = Query(None, description="Fecha de fin (YYYY-MM-DD)")
):
    """Devuelve el consumo total acumulado agrupado por insumo químico."""
    return services.obtener_consumo_acumulado(db, fecha_desde, fecha_hasta)

@router.get("/{consumo_id}", response_model=schemas.ConsumoQuimico)
def read_consumo(consumo_id: int, db: Session = Depends(get_db)):
    return services.leer_consumo(db, consumo_id)

@router.put("/{consumo_id}", response_model=schemas.ConsumoQuimico)
def update_consumo(consumo_id: int, consumo: schemas.ConsumoQuimicoUpdate, db: Session = Depends(get_db)):
    return services.modificar_consumo(db, consumo_id, consumo)

@router.delete("/{consumo_id}", response_model=schemas.ConsumoQuimicoDelete)
def delete_consumo(consumo_id: int, db: Session = Depends(get_db)):
    return services.eliminar_consumo(db, consumo_id)