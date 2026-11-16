from typing import Optional

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from src.auth.dependencies import get_current_personal, tiene_permiso_administrar
from src.database import get_db
from src.personal.models import Personal
from src.rotuladoFrontal import schemas, services
from src.rotuladoFrontal.dependencies import modulo_activo, verificar_modulo_activo

router = APIRouter(prefix="/rotulado-frontal", tags=["producción - rotulado frontal"])

PROTEGIDO = [Depends(verificar_modulo_activo), Depends(tiene_permiso_administrar)]


@router.get("/estado", response_model=schemas.EstadoModulo, dependencies=[Depends(get_current_personal)])
def read_estado():
    return schemas.EstadoModulo(activo=modulo_activo())


@router.get("/parametros", response_model=list[schemas.ConjuntoResumen], dependencies=PROTEGIDO)
def read_conjuntos(db: Session = Depends(get_db)):
    return services.listar_conjuntos(db)


@router.get("/parametros/vigente", response_model=schemas.Conjunto, dependencies=PROTEGIDO)
def read_vigente(db: Session = Depends(get_db)):
    return services.conjunto_vigente(db)


@router.get("/parametros/{conjunto_id}", response_model=schemas.Conjunto, dependencies=PROTEGIDO)
def read_conjunto(conjunto_id: int, db: Session = Depends(get_db)):
    return services.leer_conjunto(db, conjunto_id)


@router.post("/parametros", response_model=schemas.Conjunto, dependencies=[Depends(verificar_modulo_activo)])
def create_version(
    datos: schemas.NuevaVersion,
    db: Session = Depends(get_db),
    persona: Personal = Depends(tiene_permiso_administrar),
):
    return services.nueva_version(db, datos, persona)


@router.put("/parametros/{conjunto_id}", response_model=schemas.Conjunto, dependencies=PROTEGIDO)
def update_borrador(conjunto_id: int, datos: schemas.ConjuntoDatos, db: Session = Depends(get_db)):
    return services.actualizar_borrador(db, conjunto_id, datos)


@router.post(
    "/parametros/{conjunto_id}/publicar",
    response_model=schemas.Conjunto,
    dependencies=[Depends(verificar_modulo_activo)],
)
def publicar(
    conjunto_id: int,
    db: Session = Depends(get_db),
    persona: Personal = Depends(tiene_permiso_administrar),
):
    return services.publicar(db, conjunto_id, persona)


@router.delete("/parametros/{conjunto_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=PROTEGIDO)
def delete_borrador(conjunto_id: int, db: Session = Depends(get_db)):
    services.descartar(db, conjunto_id)


@router.post("/parametros/probar", response_model=schemas.ResultadoPrueba, dependencies=PROTEGIDO)
def probar(
    entrada: schemas.EntradaPrueba,
    conjunto_id: Optional[int] = Query(default=None, gt=0),
    db: Session = Depends(get_db),
):
    return services.evaluar(services.conjunto_para_calculo(db, conjunto_id), entrada)
