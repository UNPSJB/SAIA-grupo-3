from src.auth.router_base import PermissionedRouter
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from src.database import get_db
from src.pagination import PaginatedResponse
from src.tipoDocumento import schemas, services


router = PermissionedRouter(prefix="/tipos-documento", tags=["tipos_documento"])


@router.post("/", response_model=schemas.TipoDocumento)
def create_tipo_documento(
    tipo_documento: schemas.TipoDocumentoCreate, db: Session = Depends(get_db)
):
    return services.crear_tipo_documento(db, tipo_documento)


@router.get("/", response_model=PaginatedResponse[schemas.TipoDocumento])
def read_tipos_documento(
    db: Session = Depends(get_db),
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=100),
    mostrar_inactivos: bool = Query(False),
    ordenar_por: str = Query("id"),
    orden: str = Query("asc"),
    buscar: str = Query(""),
):
    return services.listar_tipos_documento(
        db, page, size, mostrar_inactivos, ordenar_por, orden, buscar
    )


@router.get("/{tipo_documento_id}", response_model=schemas.TipoDocumento)
def read_tipo_documento(
    tipo_documento_id: int, db: Session = Depends(get_db)
):
    return services.leer_tipo_documento(db, tipo_documento_id)


@router.put("/{tipo_documento_id}", response_model=schemas.TipoDocumento)
def update_tipo_documento(
    tipo_documento_id: int,
    tipo_documento: schemas.TipoDocumentoUpdate,
    db: Session = Depends(get_db),
):
    return services.modificar_tipo_documento(db, tipo_documento_id, tipo_documento)


@router.delete("/{tipo_documento_id}", response_model=schemas.TipoDocumentoDelete)
def delete_tipo_documento(
    tipo_documento_id: int, db: Session = Depends(get_db)
):
    return services.eliminar_tipo_documento(db, tipo_documento_id)
