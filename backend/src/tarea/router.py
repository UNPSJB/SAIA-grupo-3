import logging
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from src.database import get_db
from src.tarea import schemas, services
from src.pagination import PaginatedResponse

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/tareas", tags=["tareas"])

@router.post("/", response_model=schemas.Tarea)
def create_tarea(tarea: schemas.TareaCreate, db: Session = Depends(get_db)):
    return services.crear_tarea(db, tarea)

@router.get("/", response_model=PaginatedResponse[schemas.Tarea])
def read_tareas(
    db: Session = Depends(get_db),
    page: int = Query(1, ge=1, description="Número de página"),
    size: int = Query(10, ge=1, le=100, description="Cantidad de registros por página")
):
    logger.info(f"Listando tareas (página {page}, tamaño {size})")
    return services.listar_tareas(db, page, size)

@router.get("/{tarea_id}", response_model=schemas.Tarea)
def read_tarea(tarea_id: int, db: Session = Depends(get_db)):
    return services.leer_tarea(db, tarea_id)

@router.put("/{tarea_id}", response_model=schemas.Tarea)
def update_tarea(tarea_id: int, tarea: schemas.TareaUpdate, db: Session = Depends(get_db)):
    return services.modificar_tarea(db, tarea_id, tarea)

@router.delete("/{tarea_id}", response_model=schemas.TareaDelete)
def delete_tarea(tarea_id: int, db: Session = Depends(get_db)):
    return services.eliminar_tarea(db, tarea_id)