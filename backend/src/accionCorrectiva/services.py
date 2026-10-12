from datetime import datetime
from typing import List

from sqlalchemy import select, update
from sqlalchemy.orm import Session

from src.accionCorrectiva import exceptions, schemas
from src.accionCorrectiva.models import AccionCorrectiva
from src.incidente.auditoria import AccionMovimientoIncidente, registrar_movimiento
from src.incidente.constants import EstadoIncidente
from src.incidente.models import Incidente
from src.incidente.services import leer_incidente
from src.personal.models import Personal


def cerrar_incidente(
    db: Session,
    incidente_id: int,
    datos: schemas.AccionCorrectivaCreate,
    responsable: Personal,
) -> AccionCorrectiva:
    """Registra la acción correctiva y cierra el incidente (todo en una misma transacción)."""
    incidente = leer_incidente(db, incidente_id)
    if incidente.estado == EstadoIncidente.CERRADO:
        raise exceptions.IncidenteYaCerrado()

    accion = AccionCorrectiva(
        incidente_id=incidente.id,
        descripcion=datos.descripcion,
        responsable_id=responsable.id,
        fecha_cierre=datetime.now(),
        vigente=True,
    )
    db.add(accion)
    incidente.estado = EstadoIncidente.CERRADO

    # Auditoría: el cierre queda registrado con la acción tomada como detalle
    registrar_movimiento(
        db, incidente.id, AccionMovimientoIncidente.CERRADO, responsable.id,
        motivo=datos.descripcion,
    )
    db.commit()
    db.refresh(accion)
    return accion


def reabrir_incidente(
    db: Session,
    incidente_id: int,
    datos: schemas.ReaperturaIncidente,
    personal: Personal,
) -> Incidente:
    """Vuelve a abrir un incidente cerrado. La acción anterior queda en el historial."""
    incidente = leer_incidente(db, incidente_id)
    if incidente.estado != EstadoIncidente.CERRADO:
        raise exceptions.IncidenteNoCerrado()

    db.execute(
        update(AccionCorrectiva)
        .where(
            AccionCorrectiva.incidente_id == incidente.id,
            AccionCorrectiva.vigente == True,
        )
        .values(vigente=False)
    )
    incidente.estado = EstadoIncidente.ABIERTO

    # Auditoría: "dejar registro del cambio" al reabrir
    registrar_movimiento(
        db, incidente.id, AccionMovimientoIncidente.REABIERTO, personal.id,
        motivo=datos.motivo,
    )
    db.commit()
    db.refresh(incidente)
    return incidente


def listar_acciones(db: Session, incidente_id: int) -> List[AccionCorrectiva]:
    """Todas las acciones del incidente, la más reciente primero."""
    leer_incidente(db, incidente_id)
    return db.scalars(
        select(AccionCorrectiva)
        .where(AccionCorrectiva.incidente_id == incidente_id)
        .order_by(AccionCorrectiva.fecha_cierre.desc(), AccionCorrectiva.id.desc())
    ).all()


def leer_accion(db: Session, accion_id: int) -> AccionCorrectiva:
    accion = db.scalar(select(AccionCorrectiva).where(AccionCorrectiva.id == accion_id))
    if accion is None:
        raise exceptions.AccionCorrectivaNoEncontrada()
    return accion


def modificar_accion(
    db: Session, accion_id: int, datos: schemas.AccionCorrectivaUpdate
) -> AccionCorrectiva:
    """Corrige la descripción de la acción vigente. No se borran: para deshacer un
    cierre se reabre el incidente."""
    accion = leer_accion(db, accion_id)
    if not accion.vigente:
        raise exceptions.AccionNoVigente()
    accion.descripcion = datos.descripcion
    db.commit()
    db.refresh(accion)
    return accion
