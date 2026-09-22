import logging
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from src.database import get_db
from src.equipos import schemas, services
from src.pagination import PaginatedResponse

# Creamos un logger para este módulo específico
logger = logging.getLogger(__name__)

# Definimos el router con su prefijo y tag para la documentación Swagger
router = APIRouter(prefix="/equipos", tags=["equipos"])


@router.post("/", response_model=schemas.Equipo)
def create_equipo(equipo: schemas.EquipoCreate, db: Session = Depends(get_db)):
    return services.crear_equipo(db, equipo)

@router.get("/", response_model=PaginatedResponse[schemas.Equipo])
def read_equipos(
    db: Session = Depends(get_db),
    page: int = Query(1, ge=1, description="Número de página"),
    size: int = Query(10, ge=1, le=100, description="Cantidad de registros por página"),
    mostrar_inactivos: bool = Query(False, description="Incluir equipos dados de baja"),
    ordenar_por: str = Query("id", description="Columna para ordenar"),
    orden: str = Query("asc", description="asc o desc")
):
    return services.listar_equipos(db, page, size, mostrar_inactivos, ordenar_por, orden)

@router.get("/{equipo_id}", response_model=schemas.Equipo)
def read_equipo(equipo_id: int, db: Session = Depends(get_db)):
    return services.leer_equipo(db, equipo_id)


@router.put("/{equipo_id}", response_model=schemas.Equipo)
def update_equipo(
    equipo_id: int, equipo: schemas.EquipoUpdate, db: Session = Depends(get_db)
):
    """Modifica los datos de un equipo existente. Permite actualizar el sector o el número de serie."""
    return services.modificar_equipo(db, equipo_id, equipo)


@router.delete("/{equipo_id}", response_model=schemas.EquipoDelete)
def delete_equipo(equipo_id: int, db: Session = Depends(get_db)):
    """Aplica una baja lógica al equipo, pasándolo a estado inactivo sin borrarlo físicamente."""
    return services.eliminar_equipo(db, equipo_id)