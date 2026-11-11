from typing import Optional

from fastapi import Depends, Query
from sqlalchemy.orm import Session

from src.aditivoReferencia import schemas, services
from src.auth.dependencies import puede_consultar_operacion
from src.auth.router_base import PermissionedRouter
from src.database import get_db
from src.pagination import PaginatedResponse

router = PermissionedRouter(prefix="/aditivos-referencia", tags=["producción - aditivos de referencia"])


@router.post("/", response_model=schemas.AditivoReferencia)
def create_aditivo(datos: schemas.AditivoReferenciaCreate, db: Session = Depends(get_db)):
    return services.crear_aditivo(db, datos)


@router.get("/", response_model=PaginatedResponse[schemas.AditivoReferencia])
def read_aditivos(
    db: Session = Depends(get_db),
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=100),
    mostrar_inactivos: bool = Query(False),
    ordenar_por: str = Query("nombre"),
    orden: str = Query("asc"),
    buscar: str = Query(""),
    clase_funcional_id: Optional[int] = Query(None, gt=0),
):
    return services.listar_aditivos(db, page, size, mostrar_inactivos, ordenar_por, orden, buscar, clase_funcional_id)


@router.get(
    "/activos",
    response_model=list[schemas.AditivoReferencia],
    dependencies=[Depends(puede_consultar_operacion)],
)
def read_aditivos_activos(db: Session = Depends(get_db)):
    return services.listar_aditivos_activos(db)


@router.get("/{aditivo_id}", response_model=schemas.AditivoReferencia)
def read_aditivo(aditivo_id: int, db: Session = Depends(get_db)):
    return services.leer_aditivo(db, aditivo_id)


@router.put("/{aditivo_id}", response_model=schemas.AditivoReferencia)
def update_aditivo(aditivo_id: int, datos: schemas.AditivoReferenciaUpdate, db: Session = Depends(get_db)):
    return services.modificar_aditivo(db, aditivo_id, datos)


@router.delete("/{aditivo_id}", response_model=schemas.AditivoReferencia)
def delete_aditivo(aditivo_id: int, db: Session = Depends(get_db)):
    return services.eliminar_aditivo(db, aditivo_id)
