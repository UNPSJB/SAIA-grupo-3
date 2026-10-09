import logging
import shutil
import uuid
from datetime import date
from pathlib import Path

from fastapi import Depends, File, Form, HTTPException, UploadFile
from pydantic import ValidationError
from sqlalchemy.orm import Session

from src.auth.dependencies import get_current_personal, tiene_permiso_operar
from src.auth.router_base import PermissionedRouter
from src.checklist import schemas, services
from src.config import UPLOADS_DIR
from src.database import get_db
from src.exceptions import PermissionDenied
from src.personal.models import Personal


logger = logging.getLogger(__name__)

router = PermissionedRouter(prefix="/checklist", tags=["checklist"])


@router.get("/{personal_id}", response_model=schemas.Checklist, dependencies=[Depends(get_current_personal)])
def read_checklist_del_dia(
    personal_id: int,
    db: Session = Depends(get_db),
    current_personal: Personal = Depends(get_current_personal),
):
    # El operario solo puede consultar su propio checklist.
    # Administración puede consultar el de otro operario.
    if not current_personal.operar and not current_personal.administrar:
        raise PermissionDenied()

    if (
        not current_personal.administrar
        and current_personal.id != personal_id
    ):
        raise PermissionDenied()

    return services.armar_checklist(db, personal_id, date.today())


@router.post(
    "/items/{item_id}/finalizar",
    response_model=schemas.ItemChecklist,
    dependencies=[Depends(tiene_permiso_operar)],
)
def finalizar_tarea_checklist(
    item_id: int,
    consumos_json: str = Form('{"consumos":[]}'),
    foto: UploadFile | None = File(None),
    db: Session = Depends(get_db),
    current_personal: Personal = Depends(get_current_personal),
):
    foto_path = None

    if foto and foto.filename:
        if not (foto.content_type or "").startswith("image/"):
            raise HTTPException(
                status_code=400,
                detail="El archivo debe ser una imagen.",
            )

        extension = Path(foto.filename).suffix.lower()
        nombre_archivo = f"{uuid.uuid4().hex}{extension}"

        with open(UPLOADS_DIR / nombre_archivo, "wb") as destino:
            shutil.copyfileobj(foto.file, destino)

        foto_path = f"/uploads/{nombre_archivo}"

    try:
        datos = schemas.ItemFinalizarRequest.model_validate_json(consumos_json)
    except ValidationError as exc:
        raise HTTPException(
            status_code=422,
            detail=exc.errors(),
        ) from exc

    # La identidad sale del token validado, no de un campo enviado por el navegador.
    return services.finalizar_item_checklist(
        db=db,
        item_id=item_id,
        personal_id=current_personal.id,
        foto_path=foto_path,
        consumos=datos.consumos,
    )