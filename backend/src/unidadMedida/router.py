import logging
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from src.database import get_db
from src.unidadMedida import schemas, services
from src.pagination import PaginatedResponse

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/unidadMedida", tags=["unidad_medida"])

@router.get("", response_model=PaginatedResponse[schemas.UnidadMedida])
def read_unidades(
    db: Session = Depends(get_db),
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=100),
    mostrar_inactivos: bool = Query(False),
    ordenar_por: str = Query("id"),
    orden: str = Query("asc"),
    buscar: str = Query("")
):
    return services.listar_unidades_medida(db, page, size, mostrar_inactivos, ordenar_por, orden, buscar)

@router.post("", response_model=schemas.UnidadMedida)
def create_unidad(unidad: schemas.UnidadMedidaCreate, db: Session = Depends(get_db)):
    return services.crear_unidad_medida(db, unidad)

@router.put("/{unidad_id}", response_model=schemas.UnidadMedida)
def update_unidad(unidad_id: int, unidad: schemas.UnidadMedidaUpdate, db: Session = Depends(get_db)):
    return services.modificar_unidad_medida(db, unidad_id, unidad)

@router.delete("/{unidad_id}", response_model=schemas.UnidadMedidaDelete)
def delete_unidad(unidad_id: int, db: Session = Depends(get_db)):
    return services.eliminar_unidad_medida(db, unidad_id)