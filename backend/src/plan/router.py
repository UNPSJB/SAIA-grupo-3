from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from src.database import get_db
from src.plan import schemas, services
from src.pagination import PaginatedResponse

router = APIRouter(prefix="/planes", tags=["planes_limpieza"])

@router.post("/", response_model=schemas.Plan)
def create_plan(plan: schemas.PlanCreate, db: Session = Depends(get_db)):
    return services.crear_plan(db, plan)

@router.get("/", response_model=PaginatedResponse[schemas.Plan])
def read_planes(
    db: Session = Depends(get_db),
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=100),
    mostrar_inactivos: bool = Query(False)
):
    return services.listar_planes(db, page, size, mostrar_inactivos)

@router.get("/{plan_id}", response_model=schemas.Plan)
def read_plan(plan_id: int, db: Session = Depends(get_db)):
    return services.leer_plan(db, plan_id)

@router.put("/{plan_id}", response_model=schemas.Plan)
def update_plan(plan_id: int, plan: schemas.PlanUpdate, db: Session = Depends(get_db)):
    return services.modificar_plan(db, plan_id, plan)

@router.delete("/{plan_id}", response_model=schemas.Plan)
def delete_plan(plan_id: int, db: Session = Depends(get_db)):
    return services.eliminar_plan(db, plan_id)