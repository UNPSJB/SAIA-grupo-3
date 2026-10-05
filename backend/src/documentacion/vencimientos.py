from dataclasses import dataclass
from datetime import date
from typing import List, Set
from sqlalchemy.orm import Session

DIAS_AVISO_VENCIMIENTO = 30

@dataclass
class Vencimiento:
    documento_id: int
    personal_dni: int
    fecha_vencimiento: date

def buscar_vencimientos(db: Session, hoy: date | None = None) -> List[Vencimiento]:
   
   // falta implementar cuando este lista la historia anterior de vencimientos

    return []

def dnis_con_vencimientos(db: Session, hoy: date | None = None) -> Set[int]:

    return {v.personal_dni for v in buscar_vencimientos(db, hoy)}