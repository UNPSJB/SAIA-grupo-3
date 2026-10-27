from datetime import date

from fastapi import Depends, File, Form, Query, UploadFile
from sqlalchemy.orm import Session

from src.archivos.constants import EXTENSIONES_IMAGEN
from src.archivos.services import borrar_archivo, guardar_archivo
from src.database import get_db
from src.incidente import schemas, services
from src.incidente.constants import EstadoIncidente
from src.pagination import PaginatedResponse
from src.auth.router_base import PermissionedRouter
from src.auth.dependencies import (get_current_personal, tiene_permiso_operar,
    puede_consultar_operacion, tiene_permiso_administrar)
from src.exceptions import PermissionDenied, validar_schema
from src.personal.models import Personal


router = PermissionedRouter(prefix="/incidentes", tags=["incidentes"])


@router.post("/", response_model=schemas.Incidente, dependencies=[Depends(tiene_permiso_operar)])
def create_incidente(
    descripcion: str = Form(..., min_length=1, max_length=1000),
    tipo_id: int = Form(..., gt=0),
    current_personal: Personal = Depends(tiene_permiso_operar),
    foto: UploadFile | None = File(None),
    db: Session = Depends(get_db),
):
    reportado_por_dni = current_personal.dni
    incidente = validar_schema(schemas.IncidenteCreate, descripcion=descripcion, tipo_id=tipo_id)
    imagen_path = guardar_archivo(foto, EXTENSIONES_IMAGEN)
    try:
        return services.crear_incidente(db, incidente, reportado_por_dni, imagen_path)
    except Exception:
        borrar_archivo(imagen_path)
        raise


@router.get("/", response_model=PaginatedResponse[schemas.Incidente], dependencies=[Depends(puede_consultar_operacion)])
def read_incidentes(
    db: Session = Depends(get_db),
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=100),
    buscar: str = Query(""),
    ordenar_por: str = Query("fecha_hora"),
    orden: str = Query("desc"),
    estado: EstadoIncidente | None = Query(None, description="abierto o cerrado"),
    fecha_desde: date | None = Query(None, description="Desde (inclusive, formato YYYY-MM-DD)"),
    fecha_hasta: date | None = Query(None, description="Hasta (inclusive, formato YYYY-MM-DD)"),
    tipo_id: int | None = Query(None, ge=1, description="Solo incidentes de este tipo"),
    current_personal: Personal = Depends(get_current_personal),
):
    dni = None if current_personal.administrar else current_personal.dni
    return services.listar_incidentes(
        db, page, size,
        buscar=buscar, ordenar_por=ordenar_por, orden=orden,
        reportado_por_dni=dni,
        estado=estado,
        fecha_desde=fecha_desde,
        fecha_hasta=fecha_hasta,
        tipo_id=tipo_id,
    )

@router.get(
    "/abiertos",
    response_model=PaginatedResponse[schemas.IncidenteAbierto],
    dependencies=[Depends(tiene_permiso_administrar)],
)
def read_incidentes_abiertos(
    db: Session = Depends(get_db),
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=100),
    tipo_id: int | None = Query(None, ge=1),
    dias_minimos: int | None = Query(None, ge=0, description="Solo los abiertos hace N días o más"),
    buscar: str = Query(""),
    ordenar_por: str = Query("fecha_hora"),
    orden: str = Query("asc"),
):
    """Incidentes sin acción correctiva, del más viejo al más nuevo."""
    return services.listar_incidentes_abiertos(
        db, page, size, tipo_id, dias_minimos, buscar, ordenar_por, orden
    )

@router.get(
    "/abiertos/por-tipo",
    response_model=list[schemas.CantidadPorTipo],
    dependencies=[Depends(tiene_permiso_administrar)],
)
def read_abiertos_por_tipo(db: Session = Depends(get_db)):
    """Indicador 'incidentes abiertos por tipo' para el tablero (E7)."""
    return services.contar_abiertos_por_tipo(db)


@router.get(
    "/estadisticas",
    response_model=schemas.EstadisticasIncidentes,
    dependencies=[Depends(tiene_permiso_administrar)],
)
def read_estadisticas(
    db: Session = Depends(get_db),
    fecha_desde: date | None = Query(None, description="Desde (inclusive). Por defecto, hace 30 días"),
    fecha_hasta: date | None = Query(None, description="Hasta (inclusive). Por defecto, hoy"),
):
    """Incidentes por tipo y por período, para los gráficos del listado (E7)."""
    return services.estadisticas_incidentes(db, fecha_desde, fecha_hasta)


@router.get("/{incidente_id}", response_model=schemas.Incidente, dependencies=[Depends(puede_consultar_operacion)])
def read_incidente(
    incidente_id: int,
    db: Session = Depends(get_db),
    current_personal: Personal = Depends(get_current_personal),
):
    incidente = services.leer_incidente(db, incidente_id)
    if (
        not current_personal.administrar
        and incidente.reportado_por_dni != current_personal.dni
    ):
        raise PermissionDenied()
    return incidente


@router.put("/{incidente_id}", response_model=schemas.Incidente)
def update_incidente(
    incidente_id: int,
    tipo_id: int = Form(..., gt=0),
    descripcion: str = Form(..., min_length=1, max_length=1000),
    foto: UploadFile | None = File(None),
    db: Session = Depends(get_db),
):
    incidente = validar_schema(schemas.IncidenteUpdate, descripcion=descripcion, tipo_id=tipo_id)
    imagen_anterior = services.leer_incidente(db, incidente_id).imagen_path
    imagen_nueva = guardar_archivo(foto, EXTENSIONES_IMAGEN)
    try:
        incidente_actualizado = services.modificar_incidente(
            db, incidente_id, incidente, imagen_nueva
        )
    except Exception:
        borrar_archivo(imagen_nueva)
        raise
    if imagen_nueva is not None:
        borrar_archivo(imagen_anterior)
    return incidente_actualizado


@router.delete("/{incidente_id}", response_model=schemas.Incidente)
def delete_incidente(incidente_id: int, db: Session = Depends(get_db)):
    return services.eliminar_incidente(db, incidente_id)


@router.get("/{incidente_id}/movimientos", response_model=list[schemas.MovimientoIncidente])
def read_movimientos_incidente(
    incidente_id: int,
    db: Session = Depends(get_db),
    current_personal: Personal = Depends(get_current_personal),
):
    """Auditoría: historial de cambios del incidente (alta, cierres y reaperturas)."""
    incidente = services.leer_incidente(db, incidente_id)
    if (
        not current_personal.administrar
        and incidente.reportado_por_dni != current_personal.dni
    ):
        raise PermissionDenied()
    return services.listar_movimientos(db, incidente_id)
