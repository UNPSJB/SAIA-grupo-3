from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from src.auth.dependencies import get_current_personal, puede_consultar_operacion, tiene_permiso_administrar
from src.database import get_db
from src.personal.models import Personal
from src.receta import schemas, services
from src.receta.constants import PREFIJO_RUTA

router = APIRouter(prefix=PREFIJO_RUTA, tags=["producción - recetas"])


@router.get(
    "/",
    response_model=list[schemas.RecetaDeProducto],
    dependencies=[Depends(puede_consultar_operacion)],
)
def read_recetas(
    db: Session = Depends(get_db),
    buscar: str = Query("", max_length=100),
    mostrar_inactivos: bool = Query(False),
):
    return services.listar_recetas(db, buscar, mostrar_inactivos)


@router.get(
    "/vigentes",
    response_model=list[schemas.RecetaVigente],
    dependencies=[Depends(puede_consultar_operacion)],
)
def read_recetas_vigentes(db: Session = Depends(get_db), buscar: str = Query("", max_length=100)):
    return services.listar_recetas_vigentes(db, buscar)


@router.get(
    "/insumos-disponibles",
    response_model=list[schemas.InsumoDisponible],
    dependencies=[Depends(tiene_permiso_administrar)],
)
def read_insumos_disponibles(db: Session = Depends(get_db)):
    return services.listar_insumos_disponibles(db)


@router.post("/", response_model=schemas.Receta, dependencies=[Depends(tiene_permiso_administrar)])
def create_receta(
    datos: schemas.RecetaCreate,
    db: Session = Depends(get_db),
    persona: Personal = Depends(get_current_personal),
):
    return services.crear_receta(db, datos, persona)


@router.get(
    "/producto/{producto_id}",
    response_model=schemas.Receta,
    dependencies=[Depends(puede_consultar_operacion)],
)
def read_receta_de_producto(producto_id: int, db: Session = Depends(get_db)):
    return services.leer_receta_de_producto(db, producto_id)


@router.get(
    "/versiones/{version_id}",
    response_model=schemas.Version,
    dependencies=[Depends(puede_consultar_operacion)],
)
def read_version(version_id: int, db: Session = Depends(get_db)):
    return services.leer_version(db, version_id)


@router.get("/{receta_id}", response_model=schemas.Receta, dependencies=[Depends(puede_consultar_operacion)])
def read_receta(receta_id: int, db: Session = Depends(get_db)):
    return services.leer_receta(db, receta_id)


@router.get(
    "/{receta_id}/versiones",
    response_model=list[schemas.VersionResumen],
    dependencies=[Depends(puede_consultar_operacion)],
)
def read_versiones(receta_id: int, db: Session = Depends(get_db)):
    return services.listar_versiones(db, receta_id)


@router.get(
    "/{receta_id}/escalado",
    response_model=schemas.Escalado,
    dependencies=[Depends(puede_consultar_operacion)],
)
def read_escalado(
    receta_id: int,
    db: Session = Depends(get_db),
    factor: Optional[float] = Query(None, gt=0, le=1000, allow_inf_nan=False),
    cantidad_objetivo: Optional[float] = Query(None, gt=0, allow_inf_nan=False),
):
    return services.escalar_receta(db, receta_id, factor, cantidad_objetivo)


@router.post(
    "/{receta_id}/versiones",
    response_model=schemas.Receta,
    dependencies=[Depends(tiene_permiso_administrar)],
)
def create_version(
    receta_id: int,
    datos: schemas.NuevaVersion,
    db: Session = Depends(get_db),
    persona: Personal = Depends(get_current_personal),
):
    return services.guardar_nueva_version(db, receta_id, datos, persona)
