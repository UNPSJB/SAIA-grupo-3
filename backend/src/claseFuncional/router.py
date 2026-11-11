from fastapi import Depends, Query
from sqlalchemy.orm import Session

from src.auth.dependencies import puede_consultar_operacion
from src.auth.router_base import PermissionedRouter
from src.claseFuncional import schemas, services
from src.database import get_db
from src.pagination import PaginatedResponse

router = PermissionedRouter(prefix="/clases-funcionales", tags=["producción - clases funcionales"])


@router.post("/", response_model=schemas.ClaseFuncional)
def create_clase(datos: schemas.ClaseFuncionalCreate, db: Session = Depends(get_db)):
    return services.crear_clase(db, datos)


@router.get("/", response_model=PaginatedResponse[schemas.ClaseFuncional])
def read_clases(
    db: Session = Depends(get_db),
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=100),
    mostrar_inactivos: bool = Query(False),
    ordenar_por: str = Query("nombre"),
    orden: str = Query("asc"),
    buscar: str = Query(""),
):
    return services.listar_clases(db, page, size, mostrar_inactivos, ordenar_por, orden, buscar)


@router.get(
    "/activas",
    response_model=list[schemas.ClaseFuncional],
    dependencies=[Depends(puede_consultar_operacion)],
)
def read_clases_activas(db: Session = Depends(get_db)):
    return services.listar_clases_activas(db)


@router.get("/{clase_id}", response_model=schemas.ClaseFuncional)
def read_clase(clase_id: int, db: Session = Depends(get_db)):
    return services.leer_clase(db, clase_id)


@router.put("/{clase_id}", response_model=schemas.ClaseFuncional)
def update_clase(clase_id: int, datos: schemas.ClaseFuncionalUpdate, db: Session = Depends(get_db)):
    return services.modificar_clase(db, clase_id, datos)


@router.delete("/{clase_id}", response_model=schemas.ClaseFuncional)
def delete_clase(clase_id: int, db: Session = Depends(get_db)):
    return services.eliminar_clase(db, clase_id)
