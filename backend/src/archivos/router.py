from fastapi import Depends
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from src.archivos import services
from src.archivos.constants import PREFIJO_RUTA
from src.archivos.permisos import puede_ver_archivo
from src.auth.dependencies import get_current_personal
from src.auth.router_base import PermissionedRouter
from src.database import get_db
from src.exceptions import PermissionDenied
from src.personal.models import Personal


router = PermissionedRouter(prefix="/archivos", tags=["archivos"])


@router.get("/{nombre_archivo}", dependencies=[Depends(get_current_personal)])
def descargar_archivo(
    nombre_archivo: str,
    db: Session = Depends(get_db),
    current_personal: Personal = Depends(get_current_personal),
):
    ruta = services.ruta_en_disco(nombre_archivo)
    if not puede_ver_archivo(db, f"{PREFIJO_RUTA}{nombre_archivo}", current_personal):
        raise PermissionDenied()
    return FileResponse(ruta)
