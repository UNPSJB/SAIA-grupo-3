from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from src.database import get_db
from src.tareaRealizada import schemas, services
from src.pagination import PaginatedResponse

router = APIRouter(prefix="/tareas-realizadas", tags=["tareas_realizadas"])

@router.get("/", response_model=PaginatedResponse[schemas.TareaRealizada])
def read_tareas_realizadas(
    db: Session = Depends(get_db),
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=100)
):
    return services.listar_tareas_realizadas(db, page, size)

@router.get("/{tarea_realizada_id}", response_model=schemas.TareaRealizada)
def read_tarea_realizada(tarea_realizada_id: int, db: Session = Depends(get_db)):
    return services.leer_tarea_realizada(db, tarea_realizada_id)

@router.delete("/{tarea_realizada_id}", response_model=schemas.TareaRealizada)
def delete_tarea_realizada(tarea_realizada_id: int, db: Session = Depends(get_db)):
    return services.eliminar_tarea_realizada(db, tarea_realizada_id)