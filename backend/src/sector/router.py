import logging
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from src.database import get_db
from src.sector import schemas, services
from src.pagination import PaginatedResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/sectores", tags=["sectores"])


@router.post("/", response_model=schemas.Sector)
def create_sector(sector: schemas.SectorCreate, db: Session = Depends(get_db)):
    return services.crear_sector(db, sector)


@router.get("/", response_model=PaginatedResponse[schemas.Sector])
def read_sectores(
    db: Session = Depends(get_db),
    page: int = Query(1, ge=1, description="Número de página"),
    size: int = Query(10, ge=1, le=100, description="Cantidad de registros por página")
):
    logger.info(f"Listando sectores desde router (página {page}, tamaño {size})")
    return services.listar_sectores(db, page, size)


@router.get("/{sector_id}", response_model=schemas.SectorConEquipos)
def read_sector(sector_id: int, db: Session = Depends(get_db)):
    return services.leer_sector(db, sector_id)


@router.put("/{sector_id}", response_model=schemas.Sector)
def update_sector(
    sector_id: int, sector: schemas.SectorUpdate, db: Session = Depends(get_db)
):
    return services.modificar_sector(db, sector_id, sector)


@router.delete("/{sector_id}", response_model=schemas.SectorDelete)
def delete_sector(sector_id: int, db: Session = Depends(get_db)):
    return services.eliminar_sector(db, sector_id)