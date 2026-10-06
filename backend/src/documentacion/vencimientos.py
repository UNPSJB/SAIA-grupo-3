from dataclasses import dataclass
from datetime import date, timedelta
from typing import List, Set
from sqlalchemy import select
from sqlalchemy.orm import Session
from src.documentacion.models import Documentacion
from src.personal.models import Personal

# Con cuántos días de anticipación un documento se considera "por vencer"
DIAS_AVISO_VENCIMIENTO = 30

@dataclass
class Vencimiento:
    documento_id: int
    personal_dni: int
    fecha_vencimiento: date

def buscar_vencimientos(db: Session, hoy: date | None = None) -> List[Vencimiento]:
    hoy = hoy or date.today()
    limite = hoy + timedelta(days=DIAS_AVISO_VENCIMIENTO)

    filas = db.execute(
        select(Documentacion.id, Documentacion.personal_id, Documentacion.fecha_vencimiento)
        .join(Personal, Personal.dni == Documentacion.personal_id)
        .where(
            Documentacion.fecha_vencimiento.is_not(None),
            Documentacion.fecha_vencimiento <= limite,   # incluye los ya vencidos
            Personal.activo == True,
        )
    ).all()

    return [
        Vencimiento(documento_id=doc_id, personal_dni=dni, fecha_vencimiento=fecha)
        for doc_id, dni, fecha in filas
    ]

def dnis_con_vencimientos(db: Session, hoy: date | None = None) -> Set[int]:
    return {v.personal_dni for v in buscar_vencimientos(db, hoy)}
