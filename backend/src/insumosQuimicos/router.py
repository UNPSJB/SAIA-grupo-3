import logging
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from src.database import get_db
from src.insumosQuimicos import schemas, services
from src.pagination import PaginatedResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/insumos-quimicos", tags=["insumos_quimicos"])


@router.post("/", response_model=schemas.InsumoQuimico)
def create_insumo_quimico(
    insumo: schemas.InsumoQuimicoCreate, db: Session = Depends(get_db)
):
    return services.crear_insumo_quimico(db, insumo)


@router.get("/", response_model=PaginatedResponse[schemas.InsumoQuimico])
def read_insumos_quimicos(
    db: Session = Depends(get_db),
    page: int = Query(1, ge=1, description="Número de página"),
    size: int = Query(10, ge=1, le=100, description="Cantidad de registros por página"),
    mostrar_inactivos: bool = Query(False, description="Incluir químicos dados de baja"),
    ordenar_por: str = Query("id", description="Columna para ordenar"),
    orden: str = Query("asc", description="asc o desc"),
    buscar: str = Query("", description="Búsqueda por nombre"),
    tipo_quimico: str | None = Query(None, description="Filtrar por tipo de químico"),
):
    logger.info(f"Listando insumos químicos (página {page}, tamaño {size})")
    return services.listar_insumos_quimicos(
        db, page, size, mostrar_inactivos, ordenar_por, orden, buscar, tipo_quimico
    )


@router.get("/{insumo_id}", response_model=schemas.InsumoQuimico)
def read_insumo_quimico(insumo_id: int, db: Session = Depends(get_db)):
    return services.leer_insumo_quimico(db, insumo_id)


@router.put("/{insumo_id}", response_model=schemas.InsumoQuimico)
def update_insumo_quimico(
    insumo_id: int,
    insumo: schemas.InsumoQuimicoUpdate,
    db: Session = Depends(get_db),
):
    return services.modificar_insumo_quimico(db, insumo_id, insumo)


@router.delete("/{insumo_id}", response_model=schemas.InsumoQuimicoDelete)
def delete_insumo_quimico(insumo_id: int, db: Session = Depends(get_db)):
    return services.eliminar_insumo_quimico(db, insumo_id)