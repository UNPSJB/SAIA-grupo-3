from fastapi import Depends
from sqlalchemy.orm import Session

from src.accionCorrectiva import schemas, services
from src.auth.dependencies import get_current_personal, tiene_permiso_administrar
from src.auth.router_base import PermissionedRouter
from src.database import get_db
from src.exceptions import PermissionDenied
from src.incidente import schemas as incidente_schemas
from src.incidente.services import leer_incidente
from src.personal.models import Personal

# Las rutas cuelgan de /incidentes porque la acción correctiva siempre es de un incidente.
# POST / PUT: solo administración (PermissionedRouter). GET: cualquier usuario logueado.
router = PermissionedRouter(prefix="/incidentes", tags=["acciones correctivas"])


@router.post("/{incidente_id}/acciones-correctivas", response_model=schemas.AccionCorrectiva)
def registrar_accion_correctiva(
    incidente_id: int,
    datos: schemas.AccionCorrectivaCreate,
    db: Session = Depends(get_db),
    responsable: Personal = Depends(tiene_permiso_administrar),
):
    """Registra la acción correctiva y cierra el incidente."""
    return services.cerrar_incidente(db, incidente_id, datos, responsable)


@router.get("/{incidente_id}/acciones-correctivas", response_model=list[schemas.AccionCorrectiva])
def read_acciones_correctivas(
    incidente_id: int,
    db: Session = Depends(get_db),
    current_personal: Personal = Depends(get_current_personal),
):
    incidente = leer_incidente(db, incidente_id)
    # Mismo criterio que el detalle del incidente: el operario solo ve los suyos.
    if (
        not current_personal.administrar
        and incidente.reportado_por_dni != current_personal.dni
    ):
        raise PermissionDenied()
    return services.listar_acciones(db, incidente_id)


@router.post("/{incidente_id}/reabrir", response_model=incidente_schemas.Incidente)
def reabrir_incidente(
    incidente_id: int,
    datos: schemas.ReaperturaIncidente,
    db: Session = Depends(get_db),
    personal: Personal = Depends(tiene_permiso_administrar),
):
    """Reabre un incidente cerrado dejando registrado el motivo."""
    return services.reabrir_incidente(db, incidente_id, datos, personal)


@router.put("/acciones-correctivas/{accion_id}", response_model=schemas.AccionCorrectiva)
def update_accion_correctiva(
    accion_id: int,
    datos: schemas.AccionCorrectivaUpdate,
    db: Session = Depends(get_db),
):
    """Corrige la descripción de la acción correctiva vigente."""
    return services.modificar_accion(db, accion_id, datos)
