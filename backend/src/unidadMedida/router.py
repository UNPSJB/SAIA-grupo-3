from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from src.database import get_db
from src.unidadMedida import schemas, services

router = APIRouter(prefix="/unidadMedida", tags=["unidad_medida"])

# Unidad de medida
@router.get("", response_model=list[schemas.UnidadMedida])
def read_unidades(db: Session = Depends(get_db)):
    return services.listar_unidades_medida(db)

@router.post("", response_model=schemas.UnidadMedida)
def create_unidad(unidad: schemas.UnidadMedidaCreate, db: Session = Depends(get_db)):
    return services.crear_unidad_medida(db, unidad)

@router.put("/{unidad_id}", response_model=schemas.UnidadMedida)
def update_unidad(unidad_id: int, payload: dict, db: Session = Depends(get_db)):
    return services.modificar_unidad_medida(db, unidad_id, payload)

@router.delete("/{unidad_id}")
def delete_unidad(unidad_id: int, db: Session = Depends(get_db)):
    services.eliminar_unidad_medida(db, unidad_id)
    return {"mensaje": "Unidad eliminada correctamente"}