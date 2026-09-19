import logging
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from src.database import get_db
from src.equipos import schemas, services
from src.pagination import PaginatedResponse

# Creamos un logger para este módulo específico. Más info.: https://docs.python.org/3/library/logging.html
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/equipos", tags=["equipos"])

# Rutas para Equipos


@router.post("/", response_model=schemas.Equipo)
def create_equipo(equipo: schemas.EquipoCreate, db: Session = Depends(get_db)):
    return services.crear_equipo(db, equipo)


@router.get("/", response_model=PaginatedResponse[schemas.Equipo])
def read_equipos(
    db: Session = Depends(get_db),
    page: int = Query(1, ge=1, description="Número de página"),
    size: int = Query(10, ge=1, le=100, description="Cantidad de registros por página")
):
    logger.info(f"Listando equipos desde router (página {page}, tamaño {size})")
    return services.listar_equipos(db, page, size)


@router.get("/{equipo_id}", response_model=schemas.Equipo)
def read_equipo(equipo_id: int, db: Session = Depends(get_db)):
    return services.leer_equipo(db, equipo_id)


@router.put("/{equipo_id}", response_model=schemas.Equipo)
def update_equipo(
    equipo_id: int, equipo: schemas.EquipoUpdate, db: Session = Depends(get_db)
):
    return services.modificar_equipo(db, equipo_id, equipo)


@router.delete("/{equipo_id}", response_model=schemas.EquipoDelete)
def delete_equipo(equipo_id: int, db: Session = Depends(get_db)):
    return services.eliminar_equipo(db, equipo_id)
