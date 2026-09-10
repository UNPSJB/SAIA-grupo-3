from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from src.database import get_db
from src.insumos import schemas, services

router = APIRouter(prefix="/insumos", tags=["insumos"])

# Unidad de medida

@router.post("/unidades-medida", response_model=schemas.UnidadMedida)
def create_unidad_medida(unidad: schemas.UnidadMedidaCreate, db: Session = Depends(get_db)):
    return services.crear_unidad_medida(db, unidad)


@router.get("/unidades-medida", response_model=list[schemas.UnidadMedida])
def read_unidades_medida(db: Session = Depends(get_db)):
    print("Listando unidades de medida desde router")  # Usando print como me pediste
    return services.listar_unidades_medida(db)


@router.get("/unidades-medida/{unidad_id}", response_model=schemas.UnidadMedida)
def read_unidad_medida_id(unidad_id: int, db: Session = Depends(get_db)):
    return services.leer_unidad_medida(db, unidad_id)


#@router.put("/unidades-medida/{unidad_id}", response_model=schemas.UnidadMedida)
#def update_unidad_medida(
#    unidad_id: int, unidad: schemas.UnidadMedidaUpdate, db: Session = Depends(get_db)
#):
#    return services.modificar_unidad_medida(db, unidad_id, unidad)


#@router.delete("/unidades-medida/{unidad_id}", response_model=schemas.UnidadMedidaDelete)
#def delete_unidad_medida(unidad_id: int, db: Session = Depends(get_db)):
#    return services.eliminar_unidad_medida(db, unidad_id)


# Insumos

@router.post("/", response_model=schemas.Insumo)
def create_insumo(insumo: schemas.InsumoCreate, db: Session = Depends(get_db)):
    return services.crear_insumo(db, insumo)


@router.get("/", response_model=list[schemas.Insumo])
def read_insumos(db: Session = Depends(get_db)):
    print("Listando insumos desde router")  # Usando print como me pediste
    return services.listar_insumos(db)


@router.get("/{insumo_id}", response_model=schemas.Insumo)
def read_insumo_id(insumo_id: int, db: Session = Depends(get_db)):
    return services.leer_insumo(db, insumo_id)


@router.put("/{insumo_id}", response_model=schemas.Insumo)
def update_insumo(
    insumo_id: int, insumo: schemas.InsumoUpdate, db: Session = Depends(get_db)
):
    return services.modificar_insumo(db, insumo_id, insumo)


@router.delete("/{insumo_id}", response_model=schemas.InsumoDelete)
def delete_insumo(insumo_id: int, db: Session = Depends(get_db)):
    return services.eliminar_insumo(db, insumo_id)