import logging
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from src.database import get_db
from src.elementos import schemas, services
from src.pagination import PaginatedResponse

# Creamos un logger para este módulo específico
logger = logging.getLogger(__name__)

# Definimos el router con su prefijo y tag para la documentación Swagger
router = APIRouter(prefix="/elementos", tags=["elementos"])


@router.post("/", response_model=schemas.Elemento)
def create_elemento(elemento: schemas.ElementoCreate, db: Session = Depends(get_db)):
    return services.crear_elemento(db, elemento)

@router.get("/", response_model=PaginatedResponse[schemas.Elemento])
def read_elementos(
    db: Session = Depends(get_db),
    page: int = Query(1, ge=1, description="Número de página"),
    size: int = Query(10, ge=1, le=100, description="Cantidad de registros por página"),
    mostrar_inactivos: bool = Query(False, description="Incluir equipos dados de baja"),
    ordenar_por: str = Query("id", description="Columna para ordenar"),
    orden: str = Query("asc", description="asc o desc")
):
    return services.listar_elementos(db, page, size, mostrar_inactivos, ordenar_por, orden)

@router.get("/{elemento_id}", response_model=schemas.Elemento)
def read_elemento(elemento_id: int, db: Session = Depends(get_db)):
    return services.leer_elemento(db, elemento_id)


@router.put("/{elemento_id}", response_model=schemas.Elemento)
def update_elemento(
    elemento_id: int, elemento: schemas.ElementoUpdate, db: Session = Depends(get_db)
):
    """Modifica los datos de un elemento existente. Permite actualizar el sector o el número de serie."""
    return services.modificar_elemento(db, elemento_id, elemento)


@router.delete("/{elemento_id}", response_model=schemas.ElementoDelete)
def delete_elemento(elemento_id: int, db: Session = Depends(get_db)):
    """Aplica una baja lógica al elemento, pasándolo a estado inactivo sin borrarlo físicamente."""
    return services.eliminar_elemento(db, elemento_id)