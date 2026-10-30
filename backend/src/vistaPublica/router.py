from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from src.auth.dependencies import tiene_permiso_administrar
from src.auth.router_base import PermissionedRouter
from src.database import get_db
from src.personal.models import Personal
from src.vistaPublica import schemas, services

router = PermissionedRouter(prefix="/vista-publica", tags=["vista_publica"])

publico_router = APIRouter(prefix="/publico", tags=["vista_publica_visitante"])


@router.get(
    "/configuracion",
    response_model=schemas.ConfiguracionVistaPublicaResponse,
)
def read_configuracion_vista_publica(db: Session = Depends(get_db)):
    return services.leer_configuracion(db)


@router.post(
    "/activar",
    response_model=schemas.ConfiguracionVistaPublicaResponse,
)
def activar_vista_publica(
    db: Session = Depends(get_db),
    personal: Personal = Depends(tiene_permiso_administrar),
):
    return services.activar_vista_publica(db, personal)


@router.post(
    "/desactivar",
    response_model=schemas.ConfiguracionVistaPublicaResponse,
)
def desactivar_vista_publica(
    db: Session = Depends(get_db),
    personal: Personal = Depends(tiene_permiso_administrar),
):
    return services.desactivar_vista_publica(db, personal)


@publico_router.get(
    "/{token}",
    response_model=schemas.VistaPublicaResponse,
)
@router.get(
    "/publico/{token}",
    response_model=schemas.VistaPublicaResponse,
    dependencies=[],
)
def read_vista_publica_visitante(token: str, db: Session = Depends(get_db)):
    return services.consultar_vista_publica(db, token)