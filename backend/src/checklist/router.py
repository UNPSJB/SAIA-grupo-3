from datetime import date
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from src.database import get_db
from src.checklist import schemas, services

router = APIRouter(prefix="/checklist", tags=["checklist"])

# TEMPORAL: mientras no exista el login, el personal se elige desde el frontend
# y viaja en la URL. Con login, el DNI se va a obtener del usuario autenticado.
@router.get("/{personal_dni}", response_model=schemas.Checklist)
def read_checklist_del_dia(personal_dni: int, db: Session = Depends(get_db)):
    return services.armar_checklist(db, personal_dni, date.today())

#-------

@router.post("/items/{item_id}/finalizar", response_model=schemas.ItemChecklist)
def finalizar_tarea_checklist(
    item_id: int, 
    payload: schemas.ItemFinalizarRequest, 
    db: Session = Depends(get_db)
):
    """Marca un ítem como realizado y dispara la creación de su historial inmutable."""
    return services.finalizar_item_checklist(db, item_id, payload.personal_dni)