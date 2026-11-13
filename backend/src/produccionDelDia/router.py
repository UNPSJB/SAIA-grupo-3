from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from pydantic import ValidationError
from sqlalchemy.orm import Session

from src.archivos.constants import EXTENSIONES_IMAGEN
from src.archivos.services import borrar_archivo, guardar_archivo
from src.auth.dependencies import get_current_personal, puede_consultar_operacion, tiene_permiso_operar
from src.database import get_db
from src.personal.models import Personal
from src.produccionDelDia import schemas, services

router = APIRouter(prefix="/produccion-del-dia", tags=["producción - producción del día"])


@router.get("", response_model=list[schemas.LoteDelDia])
def read_produccion_del_dia(
    db: Session = Depends(get_db),
    persona: Personal = Depends(tiene_permiso_operar),
):
    return services.listar_produccion_del_dia(db, persona)


@router.post("/pasos/{paso_id}/realizar", response_model=schemas.PasoLote)
def realizar_paso(
    paso_id: int,
    valor_medido: str | None = Form(None),
    observacion: str | None = Form(None),
    foto: UploadFile | None = File(None),
    db: Session = Depends(get_db),
    persona: Personal = Depends(tiene_permiso_operar),
):
    try:
        datos = schemas.RealizarPaso(valor_medido=valor_medido, observacion=observacion)
    except ValidationError as error:
        raise HTTPException(status_code=422, detail=error.errors(include_context=False)) from error
    foto_path = guardar_archivo(foto, EXTENSIONES_IMAGEN)
    try:
        return services.realizar_paso(db, paso_id, persona, datos, foto_path)
    except Exception:
        borrar_archivo(foto_path)
        raise


@router.post("/pasos/{paso_id}/anular", response_model=schemas.PasoLote)
def anular_paso(
    paso_id: int,
    datos: schemas.AnularPaso,
    db: Session = Depends(get_db),
    persona: Personal = Depends(tiene_permiso_operar),
):
    return services.anular_paso(db, paso_id, persona, datos)


@router.get(
    "/lotes/{lote_id}/pasos",
    response_model=list[schemas.PasoConMovimientos],
    dependencies=[Depends(puede_consultar_operacion)],
)
def read_pasos_del_lote(
    lote_id: int,
    db: Session = Depends(get_db),
    persona: Personal = Depends(get_current_personal),
):
    return services.pasos_del_lote(db, lote_id, persona)
