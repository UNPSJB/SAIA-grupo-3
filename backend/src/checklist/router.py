import shutil
import uuid
from datetime import date
from pathlib import Path
from fastapi import APIRouter, Depends, Form, UploadFile, File, HTTPException
from sqlalchemy.orm import Session
from src.config import UPLOADS_DIR
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
    personal_dni: int = Form(...),
    foto: UploadFile = File(None),
    db: Session = Depends(get_db)
):
    """Marca un ítem como realizado y captura la foto opcional."""

    foto_path = None
    if foto and foto.filename:
        if not (foto.content_type or "").startswith("image/"):
            raise HTTPException(status_code=400, detail="El archivo debe ser una imagen.")

        extension = Path(foto.filename).suffix.lower()
        nombre_archivo = f"{uuid.uuid4().hex}{extension}"
        with open(UPLOADS_DIR / nombre_archivo, "wb") as destino:
            shutil.copyfileobj(foto.file, destino)

        foto_path = f"/uploads/{nombre_archivo}"

    return services.finalizar_item_checklist(db, item_id, personal_dni, foto_path)