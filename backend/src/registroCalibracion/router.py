import shutil
import uuid
from datetime import date
from pathlib import Path

from fastapi import Depends, File, Form, Query, UploadFile
from fastapi.exceptions import RequestValidationError
from pydantic import ValidationError
from sqlalchemy.orm import Session

from src.auth.router_base import PermissionedRouter
from src.config import UPLOADS_DIR
from src.database import get_db
from src.registroCalibracion import exceptions, schemas, services
from src.registroCalibracion.constants import CONTENT_TYPE_PDF, EXTENSIONES_PERMITIDAS


router = PermissionedRouter(prefix="/calibraciones", tags=["calibraciones"])


def _guardar_certificado(archivo: UploadFile | None) -> str | None:
    if archivo is None or not archivo.filename:
        return None

    extension = Path(archivo.filename).suffix.lower()
    tipo = archivo.content_type or ""
    es_imagen = tipo.startswith("image/")
    es_pdf = tipo == CONTENT_TYPE_PDF
    if extension not in EXTENSIONES_PERMITIDAS or not (es_imagen or es_pdf):
        raise exceptions.FormatoArchivoInvalido()

    nombre_archivo = f"{uuid.uuid4().hex}{extension}"
    with open(UPLOADS_DIR / nombre_archivo, "wb") as destino:
        shutil.copyfileobj(archivo.file, destino)
    return f"/uploads/{nombre_archivo}"


def _borrar_archivo(path: str | None) -> None:
    if path is not None:
        (UPLOADS_DIR / Path(path).name).unlink(missing_ok=True)


def _validar(schema, **datos):
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
    certificado_path = _guardar_certificado(certificado)
    if certificado_path is None:
        raise exceptions.CertificadoRequerido()

    try:
        return services.crear_registro(db, registro, certificado_path)
    except Exception:
        _borrar_archivo(certificado_path)
        raise


@router.get("/", response_model=list[schemas.RegistroCalibracion])
def read_registros_calibracion(
    db: Session = Depends(get_db),
    equipo_id: int | None = Query(None, ge=1, description="Filtrar calibraciones por equipo"),
):
    return services.listar_registros(db, equipo_id)


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
    certificado_nuevo = _guardar_certificado(certificado)

    try:
        registro_actualizado = services.modificar_registro(
            db, registro_id, registro, certificado_nuevo
        )
    except Exception:
        _borrar_archivo(certificado_nuevo)
        raise

    if certificado_nuevo is not None:
        _borrar_archivo(certificado_anterior)
    return registro_actualizado


@router.delete("/{registro_id}", response_model=schemas.RegistroCalibracion)
def delete_registro_calibracion(registro_id: int, db: Session = Depends(get_db)):
    return services.eliminar_registro(db, registro_id)