from fastapi import Depends, Query
from sqlalchemy.orm import Session
from datetime import date
from src.auth.dependencies import get_current_personal, puede_consultar_operacion, tiene_permiso_operar
from src.auth.router_base import PermissionedRouter
from src.database import get_db
from src.personal.models import Personal
from src.pagination import PaginatedResponse
from src.equipos import schemas as equipo_schemas
from src.registroTemperatura import schemas, services

router = PermissionedRouter(prefix="/registros-temperatura", tags=["temperatura"])

@router.post("/", response_model=schemas.RegistroTemperatura, dependencies=[Depends(tiene_permiso_operar)])
def registrar(
    datos: schemas.RegistroTemperaturaCreate, 
    db: Session = Depends(get_db),
    operario: Personal = Depends(get_current_personal)
):
    return services.registrar_temperatura(db, datos, operario)

@router.get("/", response_model=PaginatedResponse[schemas.RegistroTemperatura], dependencies=[Depends(puede_consultar_operacion)])
def listar(
    equipo_id: int | None = Query(None),
    fecha_desde: date | None = Query(None),
    fecha_hasta: date | None = Query(None),
    solo_alertas: bool = Query(False),
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db)
):
    return services.listar_registros(db, equipo_id, fecha_desde, fecha_hasta, solo_alertas, page, size)

@router.get("/pendientes-hoy", response_model=list[equipo_schemas.Equipo], dependencies=[Depends(tiene_permiso_operar)])
def pendientes_hoy(db: Session = Depends(get_db)):
    return services.equipos_pendientes_hoy(db)