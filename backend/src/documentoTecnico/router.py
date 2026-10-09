import shutil
import uuid
from pathlib import Path
from typing import Optional
from fastapi import Depends, File, Form, Query, UploadFile
from fastapi.exceptions import RequestValidationError
from fastapi.responses import FileResponse
from pydantic import ValidationError
from sqlalchemy.orm import Session
from src.auth.dependencies import tiene_permiso_administrar
from src.auth.router_base import PermissionedRouter
from src.config import ARCHIVOS_DIR
from src.database import get_db
from src.documentoTecnico import exceptions, schemas, services
from src.documentoTecnico.constants import EXTENSIONES_PERMITIDAS, TAMANIO_MAXIMO_BYTES
from src.documentoTecnico.models import EstadoDocumento, TipoDocumentoTecnico
from src.pagination import PaginatedResponse
from src.personal.models import Personal

# GET: cualquier usuario logueado. POST/PUT/PATCH: solo con permiso de administrar.
router = PermissionedRouter(prefix="/documentos-tecnicos", 
                            tags=["documentos_tecnicos"], 
                            dependencies=[Depends(tiene_permiso_administrar)] # quitar para que luego puedan ver los operarios
                            )

CARPETA_DOCUMENTOS = ARCHIVOS_DIR / "documentos-tecnicos"


def _guardar_archivo(archivo: UploadFile) -> dict:
    if not archivo.filename:
        raise exceptions.ArchivoRequerido()

    extension = Path(archivo.filename).suffix.lower()
    if extension not in EXTENSIONES_PERMITIDAS:
        raise exceptions.ArchivoNoPermitido()

    tamanio = archivo.size or 0
    if tamanio == 0:
        raise exceptions.ArchivoRequerido()
    if tamanio > TAMANIO_MAXIMO_BYTES:
        raise exceptions.ArchivoDemasiadoGrande()

    CARPETA_DOCUMENTOS.mkdir(parents=True, exist_ok=True)
    nombre_archivo = f"{uuid.uuid4().hex}{extension}"
    with open(CARPETA_DOCUMENTOS / nombre_archivo, "wb") as destino:
        shutil.copyfileobj(archivo.file, destino)

    return {
        "archivo_nombre": nombre_archivo,
        "nombre_original": archivo.filename,
        "tipo_contenido": archivo.content_type or "application/octet-stream",
        "tamanio_bytes": tamanio,
    }


def _borrar_archivo(nombre_archivo: str) -> None:
    (CARPETA_DOCUMENTOS / nombre_archivo).unlink(missing_ok=True)


# Los datos llegan como Form (junto al archivo): los validamos con el schema
# y, si fallan, devolvemos el mismo error 422 que en un endpoint JSON
def _validar_datos(**campos) -> schemas.DocumentoTecnicoBase:
    try:
        return schemas.DocumentoTecnicoBase(**campos)
    except ValidationError as error:
        raise RequestValidationError(error.errors(include_context=False))


@router.get("/", response_model=PaginatedResponse[schemas.DocumentoTecnicoResumen])
def read_documentos(
    db: Session = Depends(get_db),
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=100),
    estado: Optional[EstadoDocumento] = Query(None, description="vigente / archivado (vacío = todos)"),
    tipo: Optional[TipoDocumentoTecnico] = Query(None),
    busqueda: Optional[str] = Query(None, max_length=100, description="Busca por nombre"),
):
    return services.listar_documentos(db, page, size, estado, tipo, busqueda)


@router.get("/versiones/{version_id}/archivo")
def descargar_version(version_id: int, db: Session = Depends(get_db)):
    version = services.leer_version(db, version_id)
    ruta = CARPETA_DOCUMENTOS / version.archivo_nombre
    if not ruta.exists():
        raise exceptions.ArchivoNoDisponible()
    return FileResponse(ruta, media_type=version.tipo_contenido, filename=version.nombre_original)


@router.get("/{documento_id}", response_model=schemas.DocumentoTecnico)
def read_documento(documento_id: int, db: Session = Depends(get_db)):
    return services.leer_documento(db, documento_id)


@router.post("/", response_model=schemas.DocumentoTecnico)
def create_documento(
    nombre: str = Form(...),
    tipo: TipoDocumentoTecnico = Form(...),
    descripcion: Optional[str] = Form(None),
    archivo: UploadFile = File(...),
    current_personal: Personal = Depends(tiene_permiso_administrar),
    db: Session = Depends(get_db),
):
    datos = _validar_datos(nombre=nombre, tipo=tipo, descripcion=descripcion)
    datos_archivo = _guardar_archivo(archivo)
    try:
        return services.crear_documento(db, datos, datos_archivo, current_personal)
    except Exception:
        # Si falla la base, no dejamos el archivo huerfano en disco
        _borrar_archivo(datos_archivo["archivo_nombre"])
        raise


@router.post("/{documento_id}/versiones", response_model=schemas.DocumentoTecnico)
def upload_version(
    documento_id: int,
    archivo: UploadFile = File(...),
    comentario: Optional[str] = Form(None, max_length=500),
    current_personal: Personal = Depends(tiene_permiso_administrar),
    db: Session = Depends(get_db),
):
    if comentario is not None:
        comentario = comentario.strip() or None

    datos_archivo = _guardar_archivo(archivo)
    try:
        return services.subir_nueva_version(db, documento_id, datos_archivo, comentario, current_personal)
    except Exception:
        _borrar_archivo(datos_archivo["archivo_nombre"])
        raise


@router.put("/{documento_id}", response_model=schemas.DocumentoTecnico)
def update_documento(
    documento_id: int, datos: schemas.DocumentoTecnicoBase, db: Session = Depends(get_db)
):
    return services.modificar_documento(db, documento_id, datos)


@router.patch("/{documento_id}/archivar", response_model=schemas.DocumentoTecnico)
def archivar_documento(documento_id: int, db: Session = Depends(get_db)):
    return services.cambiar_estado(db, documento_id, EstadoDocumento.ARCHIVADO)


@router.patch("/{documento_id}/reactivar", response_model=schemas.DocumentoTecnico)
def reactivar_documento(documento_id: int, db: Session = Depends(get_db)):
    return services.cambiar_estado(db, documento_id, EstadoDocumento.VIGENTE)
