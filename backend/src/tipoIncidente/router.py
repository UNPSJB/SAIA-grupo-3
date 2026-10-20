from src.auth.router_base import PermissionedRouter
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from src.auth.dependencies import puede_consultar_operacion
from src.database import get_db
from src.pagination import PaginatedResponse
from src.tipoIncidente import schemas, services


router = PermissionedRouter(prefix="/tipos-incidente", tags=["tipos_incidente"])


@router.post("/", response_model=schemas.TipoIncidente)
def create_tipo_incidente(
    tipo_incidente: schemas.TipoIncidenteCreate, db: Session = Depends(get_db)
):
    return services.crear_tipo_incidente(db, tipo_incidente)


@router.get("/", response_model=PaginatedResponse[schemas.TipoIncidente])
def read_tipos_incidente(
    db: Session = Depends(get_db),
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=100),
    mostrar_inactivos: bool = Query(False),
    ordenar_por: str = Query("id"),
    orden: str = Query("asc"),
    buscar: str = Query(""),
):
    return services.listar_tipos_incidente(
        db, page, size, mostrar_inactivos, ordenar_por, orden, buscar)


@router.get(
    "/activos",
    response_model=list[schemas.TipoIncidente],
    dependencies=[Depends(puede_consultar_operacion)],
)
def read_tipos_incidente_activos(db: Session = Depends(get_db)):
    """Solo tipos activos: lo consumen los formularios y filtros de operación."""
    return services.listar_tipos_incidente_activos(db)


@router.get("/{tipo_incidente_id}", response_model=schemas.TipoIncidente)
def read_tipo_incidente(
    tipo_incidente_id: int, db: Session = Depends(get_db)
):
    return services.leer_tipo_incidente(db, tipo_incidente_id)


@router.put("/{tipo_incidente_id}", response_model=schemas.TipoIncidente)
def update_tipo_incidente(
    tipo_incidente_id: int,
    tipo_incidente: schemas.TipoIncidenteUpdate,
    db: Session = Depends(get_db),
):
    return services.modificar_tipo_incidente(db, tipo_incidente_id, tipo_incidente)


@router.delete("/{tipo_incidente_id}", response_model=schemas.TipoIncidenteDelete)
def delete_tipo_incidente(
    tipo_incidente_id: int, db: Session = Depends(get_db)
):
    return services.eliminar_tipo_incidente(db, tipo_incidente_id)
