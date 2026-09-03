import logging
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from src.database import get_db
from src.equipos import schemas, services

# Creamos un logger para este módulo específico. Más info.: https://docs.python.org/3/library/logging.html
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/equipos", tags=["equipos"])

# Rutas para Equipos


@router.post("/", response_model=schemas.Equipo)
def create_equipo(equipo: schemas.EquipoCreate, db: Session = Depends(get_db)):
    return services.crear_equipo(db, equipo)


@router.get("/", response_model=list[schemas.Equipo])
def read_equipo(db: Session = Depends(get_db)):
    logger.info("Listando equipos desde router") # <- este mensaje se verá por la terminal
    return services.listar_equipos(db)


@router.get("/{equipo_id}", response_model=schemas.Equipo)
def read_equipo(equipo_id: int, db: Session = Depends(get_db)):
    return services.leer_equipo(db, equipo_id)


@router.put("/{equipo_id}", response_model=schemas.Equipo)
def update_equipo(
    equipo_id: int, equipo: schemas.EquipoUpdate, db: Session = Depends(get_db)
):
    return services.modificar_equipo(db, equipo_id, equipo)


@router.delete("/{equipo_id}", response_model=schemas.EquipoDelete)
def delete_equipo(equipo_id: int, db: Session = Depends(get_db)):
    return services.eliminar_equipo(db, equipo_id)
