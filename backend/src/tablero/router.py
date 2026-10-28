from datetime import date

from fastapi import Depends, Query
from sqlalchemy.orm import Session

from src.auth.dependencies import tiene_permiso_administrar
from src.auth.router_base import PermissionedRouter
from src.database import get_db
from src.tablero import schemas, services
from src.tablero.constants import Agrupacion


router = PermissionedRouter(prefix="/tablero", tags=["tablero"])


@router.get(
    "/cumplimiento-checklist",
    response_model=schemas.CumplimientoChecklist,
    dependencies=[Depends(tiene_permiso_administrar)],
)
def read_cumplimiento_checklist(
    db: Session = Depends(get_db),
    fecha_desde: date | None = Query(None),
    fecha_hasta: date | None = Query(None),
    agrupacion: Agrupacion = Query(Agrupacion.DIA),
):
    return services.calcular_cumplimiento(db, fecha_desde, fecha_hasta, agrupacion)
