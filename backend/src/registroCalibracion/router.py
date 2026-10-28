from datetime import date

from fastapi import Depends, File, Form, Query, UploadFile
from fastapi.exceptions import RequestValidationError
from pydantic import ValidationError
from sqlalchemy.orm import Session

from src.archivos.constants import EXTENSIONES_IMAGEN_Y_PDF
from src.archivos.services import borrar_archivo, guardar_archivo
from src.auth.router_base import PermissionedRouter
from src.database import get_db
from src.documentacion.constants import EstadoVencimiento
from src.pagination import PaginatedResponse
from src.registroCalibracion import exceptions, schemas, services
from src.registroCalibracion.vencimientos import listar_vencimientos_calibracion


# GET: cualquier usuario logueado. POST / PUT / DELETE: solo administración.
router = PermissionedRouter(prefix="/calibraciones", tags=["calibraciones"])


def _validar(schema, **datos):
    """Convierte los errores de validación del schema en un 422 como el resto de la API."""
    try:
        return schema(**datos)
    except ValidationError as error:
        raise RequestValidationError(error.errors())


@router.post("/", response_model=schemas.RegistroCalibracion)
def create_registro_calibracion(
    equipo_id: int = Form(..., gt=0),
    fecha_calibracion: date = Form(...),
    otorgado_por: str = Form(..., max_length=150),
    certificado: UploadFile | None = File(None),
    db: Session = Depends(get_db),
):
    registro = _validar(
        schemas.RegistroCalibracionCreate,
        equipo_id=equipo_id,
        fecha_calibracion=fecha_calibracion,
        otorgado_por=otorgado_por,
    )
    certificado_path = guardar_archivo(certificado, EXTENSIONES_IMAGEN_Y_PDF)
    if certificado_path is None:
        raise exceptions.CertificadoRequerido()

    try:
        return services.crear_registro(db, registro, certificado_path)
    except Exception:
        borrar_archivo(certificado_path)
        raise


@router.get("/", response_model=list[schemas.RegistroCalibracion])
def read_registros_calibracion(
    db: Session = Depends(get_db),
    equipo_id: int | None = Query(None, ge=1, description="Filtrar calibraciones por equipo"),
):
    return services.listar_registros(db, equipo_id)



@router.get("/vencimientos", response_model=PaginatedResponse[schemas.VencimientoCalibracion])
def read_vencimientos_calibracion(
    db: Session = Depends(get_db),
    page: int = Query(1, ge=1, description="Número de página"),
    size: int = Query(10, ge=1, le=100, description="Cantidad de registros por página"),
    estado: EstadoVencimiento | None = Query(None, description="vencido, por_vencer o vigente"),
    solo_alertas: bool = Query(False, description="Solo vencidos y próximos a vencer"),
    buscar: str = Query("", description="Búsqueda por nombre de equipo, número de serie o sector"),
    ordenar_por: str = Query("fecha_vencimiento", description="fecha_vencimiento, equipo, numero_serie o sector"),
    orden: str = Query("asc", description="asc o desc"),
):
    return listar_vencimientos_calibracion(
        db, page, size, estado, buscar, ordenar_por, orden, solo_alertas=solo_alertas
    )


@router.get("/{registro_id}", response_model=schemas.RegistroCalibracion)
def read_registro_calibracion(registro_id: int, db: Session = Depends(get_db)):
    return services.leer_registro(db, registro_id)


@router.put("/{registro_id}", response_model=schemas.RegistroCalibracion)
def update_registro_calibracion(
    registro_id: int,
    fecha_calibracion: date = Form(...),
    otorgado_por: str = Form(..., max_length=150),
    certificado: UploadFile | None = File(None),
    db: Session = Depends(get_db),
):
    registro = _validar(
        schemas.RegistroCalibracionUpdate,
        fecha_calibracion=fecha_calibracion,
        otorgado_por=otorgado_por,
    )
    certificado_anterior = services.leer_registro(db, registro_id).certificado_path
    certificado_nuevo = guardar_archivo(certificado, EXTENSIONES_IMAGEN_Y_PDF)

    try:
        registro_actualizado = services.modificar_registro(
            db, registro_id, registro, certificado_nuevo
        )
    except Exception:
        borrar_archivo(certificado_nuevo)
        raise

    # Si se reemplazó la evidencia, borramos el archivo viejo
    if certificado_nuevo is not None:
        borrar_archivo(certificado_anterior)
    return registro_actualizado


@router.delete("/{registro_id}", response_model=schemas.RegistroCalibracion)
def delete_registro_calibracion(registro_id: int, db: Session = Depends(get_db)):
    return services.eliminar_registro(db, registro_id)
