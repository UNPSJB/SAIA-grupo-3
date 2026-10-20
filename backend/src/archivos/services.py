import shutil
import uuid
from pathlib import Path

from fastapi import UploadFile

from src.archivos import exceptions
from src.archivos.constants import PREFIJO_RUTA, TAMANIO_MAXIMO_BYTES
from src.config import UPLOADS_DIR


def guardar_archivo(archivo: UploadFile | None, extensiones: set[str]) -> str | None:
    if archivo is None or not archivo.filename:
        return None

    extension = Path(archivo.filename).suffix.lower()
    if extension not in extensiones:
        raise exceptions.FormatoNoPermitido(extensiones)
    if (archivo.size or 0) > TAMANIO_MAXIMO_BYTES:
        raise exceptions.ArchivoDemasiadoGrande()

    UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
    nombre_archivo = f"{uuid.uuid4().hex}{extension}"
    with open(UPLOADS_DIR / nombre_archivo, "wb") as destino:
        shutil.copyfileobj(archivo.file, destino)
    return f"{PREFIJO_RUTA}{nombre_archivo}"


def borrar_archivo(ruta: str | None) -> None:
    if ruta:
        (UPLOADS_DIR / Path(ruta).name).unlink(missing_ok=True)


def ruta_en_disco(nombre_archivo: str) -> Path:
    if not nombre_archivo or Path(nombre_archivo).name != nombre_archivo:
        raise exceptions.ArchivoNoEncontrado()
    ruta = UPLOADS_DIR / nombre_archivo
    if not ruta.is_file():
        raise exceptions.ArchivoNoEncontrado()
    return ruta
