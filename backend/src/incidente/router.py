import shutil
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile
from sqlalchemy.orm import Session

from src.config import UPLOADS_DIR
from src.database import get_db
from src.incidente import schemas, services
from src.pagination import PaginatedResponse
from src.auth.router_base import PermissionedRouter
from src.auth.dependencies import get_current_personal, tiene_permiso_operar
from src.exceptions import PermissionDenied
from src.personal.models import Personal


router = PermissionedRouter(prefix="/incidentes", tags=["incidentes"])


def _guardar_imagen(foto: UploadFile | None) -> str | None:
    if foto is None or not foto.filename:
        return None
    if not (foto.content_type or "").startswith("image/"):
        raise HTTPException(status_code=400, detail="El archivo debe ser una imagen.")

    extension = Path(foto.filename).suffix.lower()
    nombre_archivo = f"{uuid.uuid4().hex}{extension}"
    with open(UPLOADS_DIR / nombre_archivo, "wb") as destino:
        shutil.copyfileobj(foto.file, destino)
    return f"/uploads/{nombre_archivo}"


@router.post("/", response_model=schemas.Incidente, dependencies=[Depends(tiene_permiso_operar)])
def create_incidente(
    descripcion: str = Form(..., min_length=1, max_length=1000),
    current_personal: Personal = Depends(tiene_permiso_operar),
    foto: UploadFile | None = File(None),
    db: Session = Depends(get_db),
):
    reportado_por_dni = current_personal.dni
    incidente = schemas.IncidenteCreate(descripcion=descripcion)
    imagen_path = _guardar_imagen(foto)
    try:
        return services.crear_incidente(db, incidente, reportado_por_dni, imagen_path)
    except Exception:
        if imagen_path is not None:
            (UPLOADS_DIR / Path(imagen_path).name).unlink(missing_ok=True)
        raise


@router.get("/", response_model=PaginatedResponse[schemas.Incidente])
def read_incidentes(
    db: Session = Depends(get_db),
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=100),
    current_personal: Personal = Depends(get_current_personal),
):
    # El operario solo ve sus incidentes; administración ve todos.
    dni = None if current_personal.administrar else current_personal.dni
    return services.listar_incidentes(db, page, size, reportado_por_dni=dni)


@router.get("/{incidente_id}", response_model=schemas.Incidente)
def read_incidente(
    incidente_id: int,
    db: Session = Depends(get_db),
    current_personal: Personal = Depends(get_current_personal),
):
    incidente = services.leer_incidente(db, incidente_id)
    # El operario solo puede ver sus propios incidentes.
    # Administración puede ver el de cualquier operario.
    if (
        not current_personal.administrar
        and incidente.reportado_por_dni != current_personal.dni
    ):
        raise PermissionDenied()
    return incidente


@router.put("/{incidente_id}", response_model=schemas.Incidente)
def update_incidente(
    incidente_id: int,
    descripcion: str = Form(..., min_length=1, max_length=1000),
    foto: UploadFile | None = File(None),
    db: Session = Depends(get_db),
):
    incidente = schemas.IncidenteUpdate(descripcion=descripcion)
    imagen_anterior = services.leer_incidente(db, incidente_id).imagen_path
    imagen_nueva = _guardar_imagen(foto)
    try:
        incidente_actualizado = services.modificar_incidente(
            db, incidente_id, incidente, imagen_nueva
        )
    except Exception:
        if imagen_nueva is not None:
            (UPLOADS_DIR / Path(imagen_nueva).name).unlink(missing_ok=True)
        raise
    if imagen_nueva is not None and imagen_anterior is not None:
        (UPLOADS_DIR / Path(imagen_anterior).name).unlink(missing_ok=True)
    return incidente_actualizado


@router.delete("/{incidente_id}", response_model=schemas.Incidente)
def delete_incidente(incidente_id: int, db: Session = Depends(get_db)):
    return services.eliminar_incidente(db, incidente_id)
