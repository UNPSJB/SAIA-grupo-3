from sqlalchemy import select
from sqlalchemy.orm import Session

from src.archivos import exceptions
from src.checklist.models import ItemChecklist, MovimientoItemChecklist
from src.incidente.models import Incidente
from src.personal.models import Personal
from src.registroCalibracion.models import RegistroCalibracion
from src.tareaRealizada.models import TareaRealizada


def puede_ver_archivo(db: Session, ruta: str, personal: Personal) -> bool:
    incidente = db.scalar(select(Incidente).where(Incidente.imagen_path == ruta))
    if incidente is not None:
        return personal.administrar or incidente.reportado_por_dni == personal.dni

    if db.scalar(select(RegistroCalibracion.id).where(RegistroCalibracion.certificado_path == ruta)) is not None:
        return personal.administrar

    item = db.scalar(select(ItemChecklist).where(ItemChecklist.foto_path == ruta))
    if item is not None:
        return personal.administrar or personal.id in (item.responsable_id, item.realizada_por_id)

    movimiento = db.scalar(select(MovimientoItemChecklist).where(MovimientoItemChecklist.foto_path == ruta))
    if movimiento is not None:
        return personal.administrar or movimiento.personal_id == personal.id

    if db.scalar(select(TareaRealizada.id).where(TareaRealizada.foto_path == ruta)) is not None:
        return personal.administrar

    raise exceptions.ArchivoNoEncontrado()
