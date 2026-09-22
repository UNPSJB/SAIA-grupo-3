import logging
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from src.database import get_db
from src.personal import schemas, services
from src.pagination import PaginatedResponse

# Creamos un logger para este módulo específico. Más info.: https://docs.python.org/3/library/logging.html
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/personal", tags=["personal"])

# Rutas para Personas


@router.post("/", response_model=schemas.Personal)
def create_personal(personal: schemas.PersonalCreate, db: Session = Depends(get_db)):
    return services.crear_personal(db, personal)


@router.get("/", response_model=PaginatedResponse[schemas.Personal])
def read_personal(db: Session = Depends(get_db),
    page: int = Query(1, ge=1, description="Número de página"),
    size: int = Query(10, ge=1, le=100, description="Cantidad de registros por página")
):
    return services.listar_personal(db, page, size)


@router.get("/{personal_id}", response_model=schemas.Personal)
def read_personal_id(personal_id: int, db: Session = Depends(get_db)):
    return services.leer_personal(db, personal_id)

    
@router.put("/{personal_id}", response_model=schemas.Personal)
def update_personal(
    personal_id: int, personal: schemas.PersonalUpdate, db: Session = Depends(get_db)
):
    return services.modificar_personal(db, personal_id, personal)


@router.delete("/{personal_id}", response_model=schemas.Personal)
def delete_personal(personal_id: int, db: Session = Depends(get_db)):
    return services.eliminar_personal(db, personal_id)
