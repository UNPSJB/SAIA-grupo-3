import logging
from datetime import date

from fastapi import Depends, File, Form, HTTPException, UploadFile
from pydantic import ValidationError
from sqlalchemy.orm import Session

from src.archivos.constants import EXTENSIONES_IMAGEN
from src.archivos.services import borrar_archivo, guardar_archivo
from src.auth.dependencies import get_current_personal, tiene_permiso_operar
from src.auth.router_base import PermissionedRouter
from src.checklist import schemas, services
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
    try:
        datos = schemas.ItemFinalizarRequest.model_validate_json(consumos_json)
    except ValidationError as exc:
        raise HTTPException(
            status_code=422,
            detail=exc.errors(),
        ) from exc

    foto_path = guardar_archivo(foto, EXTENSIONES_IMAGEN)
    try:
        # La identidad sale del token validado, no de un campo enviado por el navegador.
        return services.finalizar_item_checklist(
            db=db,
            item_id=item_id,
            personal_id=current_personal.id,
            foto_path=foto_path,
            consumos=datos.consumos,
        )
    except Exception:
        borrar_archivo(foto_path)
        raise