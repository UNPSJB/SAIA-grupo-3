from fastapi import Depends, Query
from sqlalchemy.orm import Session

from src.alergeno import schemas, services
from src.auth.router_base import PermissionedRouter
from src.database import get_db

router = PermissionedRouter(prefix="/alergenos", tags=["producción - alérgenos"])


@router.get("/", response_model=list[schemas.Alergeno])
def read_alergenos(mostrar_inactivos: bool = Query(False), db: Session = Depends(get_db)):
    return services.listar(db, mostrar_inactivos)


@router.post("/", response_model=schemas.Alergeno)
def create_alergeno(datos: schemas.AlergenoCreate, db: Session = Depends(get_db)):
    return services.crear(db, datos)


@router.get("/{alergeno_id}", response_model=schemas.Alergeno)
def read_alergeno(alergeno_id: int, db: Session = Depends(get_db)):
    return services.leer(db, alergeno_id)


@router.put("/{alergeno_id}", response_model=schemas.Alergeno)
def update_alergeno(alergeno_id: int, datos: schemas.AlergenoUpdate, db: Session = Depends(get_db)):
    return services.modificar(db, alergeno_id, datos)


@router.delete("/{alergeno_id}", response_model=schemas.Alergeno)
def delete_alergeno(alergeno_id: int, db: Session = Depends(get_db)):
    return services.desactivar(db, alergeno_id)
