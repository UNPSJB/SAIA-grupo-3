from fastapi import APIRouter, Depends, File, Form, Query, UploadFile
from sqlalchemy.orm import Session

from src.auth.dependencies import tiene_permiso_administrar
from src.database import get_db
from src.nutricion import exceptions, schemas, services
from src.personal.models import Personal

router = APIRouter(
    prefix="/nutricion",
    tags=["producción - información nutricional"],
    dependencies=[Depends(tiene_permiso_administrar)],
)


@router.get("/alimentos", response_model=list[schemas.AlimentoReferencia])
def read_alimentos(
    db: Session = Depends(get_db),
    buscar: str = Query("", max_length=100),
    limite: int = Query(30, ge=1, le=200),
):
    return services.buscar_alimentos(db, buscar, limite)


@router.post("/alimentos/importar", response_model=schemas.ResultadoImportacion)
async def importar_alimentos(
    archivo: UploadFile = File(...),
    fuente: str = Form(..., max_length=60),
    db: Session = Depends(get_db),
):
    crudo = await archivo.read()
    try:
        contenido = crudo.decode("utf-8-sig")
    except UnicodeDecodeError:
        contenido = crudo.decode("latin-1")
    if not contenido.strip():
        raise exceptions.ArchivoInvalido("el archivo está vacío.")
    return services.importar_csv(db, contenido, fuente)


@router.get("/insumos/{insumo_id}", response_model=schemas.DatosNutricionales)
def read_datos(insumo_id: int, db: Session = Depends(get_db)):
    return services.obtener_datos(db, insumo_id)


@router.put("/insumos/{insumo_id}", response_model=schemas.DatosNutricionales)
def cargar_manual(
    insumo_id: int,
    datos: schemas.CargaManual,
    db: Session = Depends(get_db),
    persona: Personal = Depends(tiene_permiso_administrar),
):
    return services.cargar_manual(db, insumo_id, datos, persona)


@router.post("/insumos/{insumo_id}/copiar-referencia", response_model=schemas.DatosNutricionales)
def copiar_referencia(
    insumo_id: int,
    datos: schemas.CopiaReferencia,
    db: Session = Depends(get_db),
    persona: Personal = Depends(tiene_permiso_administrar),
):
    return services.copiar_referencia(db, insumo_id, datos, persona)


@router.patch("/insumos/{insumo_id}/valores", response_model=schemas.DatosNutricionales)
def modificar_valores(
    insumo_id: int,
    datos: schemas.ModificacionValores,
    db: Session = Depends(get_db),
    persona: Personal = Depends(tiene_permiso_administrar),
):
    return services.modificar_valores(db, insumo_id, datos, persona)


@router.get("/insumos/{insumo_id}/historial", response_model=list[schemas.MovimientoHistorial])
def read_historial(insumo_id: int, db: Session = Depends(get_db)):
    return services.listar_historial(db, insumo_id)
