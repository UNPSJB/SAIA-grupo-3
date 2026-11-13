from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from src.auth.dependencies import tiene_permiso_administrar
from src.configuracionProduccion import schemas, services
from src.database import get_db
from src.personal.models import Personal

router = APIRouter(prefix="/configuracion-produccion", tags=["producción - configuración"])


@router.get("", response_model=schemas.Configuracion, dependencies=[Depends(tiene_permiso_administrar)])
def read_configuracion(db: Session = Depends(get_db)):
    configuracion = services.obtener_configuracion(db)
    db.commit()
    return configuracion


@router.put("", response_model=schemas.Configuracion)
def update_configuracion(
    datos: schemas.ConfiguracionUpdate,
    db: Session = Depends(get_db),
    persona: Personal = Depends(tiene_permiso_administrar),
):
    return services.actualizar_configuracion(db, datos, persona)
