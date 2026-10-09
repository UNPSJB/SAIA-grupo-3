from src.auth.dependencies import get_current_personal, tiene_permiso_administrar
from src.exceptions import PermissionDenied
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from src.database import get_db
from src.personal import schemas, services
from src.pagination import PaginatedResponse
from src.auth.router_base import PermissionedRouter
from src.personal import models, schemas, services

router = PermissionedRouter(prefix="/personal", tags=["personal"])

# Rutas para Personas


@router.post("/", response_model=schemas.Personal)
def create_personal(personal: schemas.PersonalCreate, db: Session = Depends(get_db)):
    return services.crear_personal(db, personal)


@router.get("/", response_model=PaginatedResponse[schemas.Personal],
dependencies=[Depends(tiene_permiso_administrar)])
def read_personal(
    db: Session = Depends(get_db),
    page: int = Query(1, ge=1, description="Número de página"),
    size: int = Query(10, ge=1, le=100, description="Cantidad de registros por página"),
    mostrar_inactivos: bool = Query(False, description="Incluir personal dado de baja"),
    proximos_a_vencer: bool = Query(False, description="Solo personal con documentación vencida o por vencer"),
    buscar: str = Query(""),
    ordenar_por: str = Query("id"),
    orden: str = Query("asc"),
):
    return services.listar_personal(db, page, size, mostrar_inactivos, proximos_a_vencer, buscar=buscar, ordenar_por=ordenar_por, orden=orden)


@router.get("/{personal_id}", response_model=schemas.Personal, dependencies=[Depends(get_current_personal)])
def read_personal_id(
    personal_id: int,
    db: Session = Depends(get_db),
    current_personal: models.Personal = Depends(get_current_personal),
):
    if not current_personal.administrar and current_personal.id != personal_id:
        raise PermissionDenied()

    return services.leer_personal(db, personal_id)

    
@router.put("/{personal_id}", response_model=schemas.Personal)
def update_personal(
    personal_id: int, personal: schemas.PersonalUpdate, db: Session = Depends(get_db)
):
    """También se usa para reactivar: enviando activo=true se puede recuperar a alguien dado de baja."""
    return services.modificar_personal(db, personal_id, personal)


@router.delete("/{personal_id}", response_model=schemas.Personal)
def delete_personal(personal_id: int, db: Session = Depends(get_db)):
    """Aplica una baja lógica: pasa a la persona a estado inactivo sin borrarla físicamente."""
    return services.eliminar_personal(db, personal_id)
