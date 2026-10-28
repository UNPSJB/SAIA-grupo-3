from typing import Literal

from fastapi import Depends, Query
from sqlalchemy.orm import Session
from src.database import get_db
from src.documentacion import schemas, services
from src.auth.router_base import PermissionedRouter
from src.documentacion.constants import EstadoVencimiento
from src.documentacion.vencimientos import (
    listar_vencimientos,
    listar_vencimientos_consolidados,
)
from src.pagination import PaginatedResponse


router = PermissionedRouter(prefix="/documentacion", tags=["documentacion"])
vencimientos_router = PermissionedRouter(prefix="/vencimientos", tags=["vencimientos"])

# Rutas para Documentos


@router.post("/", response_model=schemas.Documento)
def create_documento(documento: schemas.DocumentoCreate, db: Session = Depends(get_db)):
    return services.crear_documento(db, documento)


@router.get("/", response_model=list[schemas.Documento])
def read_documentos(
    db: Session = Depends(get_db),
    personal_id: int | None = Query(
        None, ge=1, description="Filtrar documentos por personal"
    ),
):
    return services.listar_documentos(db, personal_id)


@router.get("/vencimientos", response_model=PaginatedResponse[schemas.Vencimiento])
def read_vencimientos(
    db: Session = Depends(get_db),
    page: int = Query(1, ge=1, description="Número de página"),
    size: int = Query(10, ge=1, le=100, description="Cantidad de registros por página"),
    estado: EstadoVencimiento | None = Query(None, description="vencido, por_vencer o vigente"),
    solo_alertas: bool = Query(False),
    buscar: str = Query("", description="Búsqueda por apellido, nombre, DNI o tipo de documento"),
    ordenar_por: str = Query("fecha_vencimiento", description="fecha_vencimiento, empleado, dni o tipo_documento"),
    orden: str = Query("asc", description="asc o desc"),
):
    return listar_vencimientos(db, page, size, estado, buscar, ordenar_por, orden, solo_alertas=solo_alertas)


@router.get("/{documento_id}", response_model=schemas.Documento)
def read_documento(documento_id: int, db: Session = Depends(get_db)):
    return services.leer_documento(db, documento_id)


@router.put("/{documento_id}", response_model=schemas.Documento)
def update_documento(
    documento_id: int, documento: schemas.DocumentoUpdate, db: Session = Depends(get_db)
):
    return services.modificar_documento(db, documento_id, documento)


@router.delete("/{documento_id}", response_model=schemas.DocumentoDelete)
def delete_documento(documento_id: int, db: Session = Depends(get_db)):
    return services.eliminar_documento(db, documento_id)


@vencimientos_router.get(
    "/consolidados",
    response_model=PaginatedResponse[schemas.VencimientoConsolidado],
)
def read_vencimientos_consolidados(
    db: Session = Depends(get_db),
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=100),
    origen: Literal["todos", "documentacion", "calibracion"] = Query("todos"),
    estado: EstadoVencimiento | None = Query(None),
    solo_alertas: bool = Query(False),
    buscar: str = Query(""),
    ordenar_por: Literal["fecha_vencimiento", "elemento"] = Query(
        "fecha_vencimiento"
    ),
    orden: Literal["asc", "desc"] = Query("asc"),
):
    return listar_vencimientos_consolidados(
        db,
        page=page,
        size=size,
        origen=origen,
        estado=estado,
        solo_alertas=solo_alertas,
        buscar=buscar,
        ordenar_por=ordenar_por,
        orden=orden,
    )
