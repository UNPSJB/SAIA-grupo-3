from datetime import date

from fastapi import Depends, Query
from sqlalchemy.orm import Session

from src.auth.dependencies import puede_consultar_operacion, tiene_permiso_operar
from src.auth.router_base import PermissionedRouter
from src.database import get_db
from src.exceptions import PermissionDenied
from src.loteProduccion import schemas, services
from src.pagination import PaginatedResponse
from src.personal.models import Personal

router = PermissionedRouter(prefix="/lotes-produccion", tags=["lotes_produccion"])


@router.post("/", response_model=schemas.LoteProduccion, dependencies=[Depends(tiene_permiso_operar)])
def create_lote(
    lote: schemas.LoteProduccionCreate,
    db: Session = Depends(get_db),
    current_personal: Personal = Depends(tiene_permiso_operar),
):
    return services.crear_lote(db, lote, current_personal.id)


@router.get("/", response_model=PaginatedResponse[schemas.LoteProduccion], dependencies=[Depends(puede_consultar_operacion)])
def read_lotes(
    db: Session = Depends(get_db),
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=100),
    mostrar_inactivos: bool = Query(False),
    ordenar_por: str = Query("fecha_produccion"),
    orden: str = Query("desc"),
    buscar: str = Query(""),
    producto_id: int | None = Query(None, ge=1),
    fecha_desde: date | None = Query(None),
    fecha_hasta: date | None = Query(None),
    current_personal: Personal = Depends(puede_consultar_operacion),
):
    registrado_por_id = None if current_personal.administrar else current_personal.id
    return services.listar_lotes(
        db, page, size, mostrar_inactivos, ordenar_por, orden, buscar,
        producto_id=producto_id,
        fecha_desde=fecha_desde,
        fecha_hasta=fecha_hasta,
        registrado_por_id=registrado_por_id,
    )


@router.get("/{lote_id}", response_model=schemas.LoteProduccion, dependencies=[Depends(puede_consultar_operacion)])
def read_lote(
    lote_id: int,
    db: Session = Depends(get_db),
    current_personal: Personal = Depends(puede_consultar_operacion),
):
    lote = services.leer_lote(db, lote_id)
    if not current_personal.administrar and lote.registrado_por_id != current_personal.id:
        raise PermissionDenied()
    return lote


@router.put("/{lote_id}", response_model=schemas.LoteProduccion)
def update_lote(lote_id: int, lote: schemas.LoteProduccionUpdate, db: Session = Depends(get_db)):
    return services.modificar_lote(db, lote_id, lote)


@router.delete("/{lote_id}", response_model=schemas.LoteProduccion)
def delete_lote(lote_id: int, db: Session = Depends(get_db)):
    return services.eliminar_lote(db, lote_id)
