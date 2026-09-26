from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from src.database import get_db
from src.planRealizado import schemas, services
from src.pagination import PaginatedResponse

router = APIRouter(prefix="/planes-realizados", tags=["planes_realizados"])

@router.post("/", response_model=schemas.PlanRealizado)
def create_plan_realizado(plan: schemas.PlanRealizadoCreate, db: Session = Depends(get_db)):
    """Registra la ejecución de un plan capturando una foto exacta de sus tareas."""
    return services.crear_plan_realizado(db, plan)

@router.get("/", response_model=PaginatedResponse[schemas.PlanRealizado])
def read_planes_realizados(
    db: Session = Depends(get_db),
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=100)
):
    return services.listar_planes_realizados(db, page, size)

@router.get("/{plan_realizado_id}", response_model=schemas.PlanRealizado)
def read_plan_realizado(plan_realizado_id: int, db: Session = Depends(get_db)):
    return services.leer_plan_realizado(db, plan_realizado_id)

@router.delete("/{plan_realizado_id}", response_model=schemas.PlanRealizado)
def delete_plan_realizado(plan_realizado_id: int, db: Session = Depends(get_db)):
    """Borra un registro histórico (y sus tareas vinculadas en cascada)."""
    return services.eliminar_plan_realizado(db, plan_realizado_id)