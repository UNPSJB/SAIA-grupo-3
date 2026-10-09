from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from src.database import get_db
from src.consumoQuimico import schemas, services
from src.pagination import PaginatedResponse
from typing import List
from datetime import date
from src.auth.router_base import PermissionedRouter
from src.auth.dependencies import tiene_permiso_administrar

router = PermissionedRouter(prefix="/consumo-quimico", tags=["consumo-quimico"])

@router.post("/", response_model=schemas.ConsumoQuimico)
def create_consumo(consumo: schemas.ConsumoQuimicoCreate, db: Session = Depends(get_db)):
    return services.crear_consumo(db, consumo)

@router.get(
    "/",
    response_model=PaginatedResponse[schemas.ConsumoQuimico],
    dependencies=[Depends(tiene_permiso_administrar)],
)
def read_consumos(
    db: Session = Depends(get_db),
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=100),
    mostrar_inactivos: bool = Query(False),
    ordenar_por: str = Query("fecha"),
    orden: str = Query("desc"),
    buscar: str = Query(""),
):
    return services.listar_consumos(
        db, page, size, mostrar_inactivos, ordenar_por, orden, buscar=buscar)

@router.get(
    "/reporte/acumulado",
    response_model=List[schemas.ConsumoAcumulado],
    dependencies=[Depends(tiene_permiso_administrar)],
)
def reporte_consumo_acumulado(
    db: Session = Depends(get_db),
    fecha_desde: date | None = Query(None),
    fecha_hasta: date | None = Query(None),
    buscar: str = Query(""),
    ordenar_por: str = Query("nombre_insumo"),
    orden: str = Query("asc"),
):
    return services.obtener_consumo_acumulado(db, fecha_desde, fecha_hasta, buscar, ordenar_por, orden)

@router.get(
    "/{consumo_id}",
    response_model=schemas.ConsumoQuimico,
    dependencies=[Depends(tiene_permiso_administrar)],
)
def read_consumo(consumo_id: int, db: Session = Depends(get_db)):
    return services.leer_consumo(db, consumo_id)

@router.put("/{consumo_id}", response_model=schemas.ConsumoQuimico)
def update_consumo(consumo_id: int, consumo: schemas.ConsumoQuimicoUpdate, db: Session = Depends(get_db)):
    return services.modificar_consumo(db, consumo_id, consumo)

@router.delete("/{consumo_id}", response_model=schemas.ConsumoQuimicoDelete)
def delete_consumo(consumo_id: int, db: Session = Depends(get_db)):
    return services.eliminar_consumo(db, consumo_id)