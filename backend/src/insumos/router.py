from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from src.database import get_db
from src.insumos import schemas, services
from src.pagination import PaginatedResponse

router = APIRouter(prefix="/insumos", tags=["insumos"])

@router.post("/", response_model=schemas.Insumo)
def create_insumo(insumo: schemas.InsumoCreate, db: Session = Depends(get_db)):
    return services.crear_insumo(db, insumo)

@router.get("/", response_model=PaginatedResponse[schemas.Insumo])
def read_insumos(
    db: Session = Depends(get_db),
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=100),
    mostrar_inactivos: bool = Query(False),
    ordenar_por: str = Query("id"),
    orden: str = Query("asc"),
    buscar: str = Query("")
):
    return services.listar_insumos(db, page, size, mostrar_inactivos, ordenar_por, orden, buscar)

@router.get("/{insumo_id}", response_model=schemas.Insumo)
def read_insumo_id(insumo_id: int, db: Session = Depends(get_db)):
    return services.leer_insumo(db, insumo_id)

@router.put("/{insumo_id}", response_model=schemas.Insumo)
def update_insumo(insumo_id: int, insumo: schemas.InsumoUpdate, db: Session = Depends(get_db)):
    return services.modificar_insumo(db, insumo_id, insumo)

@router.delete("/{insumo_id}", response_model=schemas.InsumoDelete)
def delete_insumo(insumo_id: int, db: Session = Depends(get_db)):
    return services.eliminar_insumo(db, insumo_id)