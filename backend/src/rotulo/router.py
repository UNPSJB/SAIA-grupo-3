from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from src.auth.dependencies import tiene_permiso_administrar
from src.database import get_db
from src.personal.models import Personal
from src.rotulo import schemas, services, vista_previa

router = APIRouter(prefix="/rotulos", tags=["producción - rotulado"])


@router.get("/", response_model=list[schemas.RotuloListado], dependencies=[Depends(tiene_permiso_administrar)])
def read_rotulos(db: Session = Depends(get_db)):
    return services.listar_rotulos(db)


@router.get(
    "/productos/{producto_id}",
    response_model=schemas.Borrador,
    dependencies=[Depends(tiene_permiso_administrar)],
)
def read_borrador(producto_id: int, db: Session = Depends(get_db)):
    return services.obtener_borrador(db, producto_id)


@router.get(
    "/productos/{producto_id}/vista-previa",
    response_model=schemas.VistaPrevia,
    dependencies=[Depends(tiene_permiso_administrar)],
)
def read_vista_previa(producto_id: int, db: Session = Depends(get_db)):
    return vista_previa.obtener_vista_previa(db, producto_id)


@router.post("/productos/{producto_id}", response_model=schemas.Borrador)
def create_borrador(
    producto_id: int,
    db: Session = Depends(get_db),
    persona: Personal = Depends(tiene_permiso_administrar),
):
    return services.crear_borrador(db, producto_id, persona)


@router.put("/productos/{producto_id}", response_model=schemas.Borrador)
def update_borrador(
    producto_id: int,
    datos: schemas.BorradorDatos,
    db: Session = Depends(get_db),
    persona: Personal = Depends(tiene_permiso_administrar),
):
    return services.actualizar_borrador(db, producto_id, datos, persona)


@router.post("/productos/{producto_id}/alergenos/confirmar", response_model=schemas.Borrador)
def confirm_alergenos(
    producto_id: int,
    db: Session = Depends(get_db),
    persona: Personal = Depends(tiene_permiso_administrar),
):
    return services.confirmar_alergenos(db, producto_id, persona)
