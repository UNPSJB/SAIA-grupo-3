from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from src.auth.dependencies import get_current_personal
from src.database import get_db
from src.perfil import schemas, services
from src.personal.models import Personal

router = APIRouter(prefix="/perfil", tags=["perfil"])


@router.get("", response_model=schemas.Perfil)
def read_perfil(current_personal: Personal = Depends(get_current_personal)):
    return current_personal


@router.patch("", response_model=schemas.Perfil)
def update_perfil(
    datos: schemas.PerfilUpdate,
    db: Session = Depends(get_db),
    current_personal: Personal = Depends(get_current_personal),
):
    return services.actualizar_perfil(db, current_personal, datos)


@router.get("/documentacion", response_model=list[schemas.DocumentoPerfil])
def read_documentacion(
    db: Session = Depends(get_db),
    current_personal: Personal = Depends(get_current_personal),
):
    return services.listar_documentacion(db, current_personal)


@router.put("/password", status_code=status.HTTP_204_NO_CONTENT)
def update_password(
    datos: schemas.CambioPassword,
    db: Session = Depends(get_db),
    current_personal: Personal = Depends(get_current_personal),
):
    services.cambiar_password(db, current_personal, datos)
