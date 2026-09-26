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
