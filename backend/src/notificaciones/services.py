from datetime import date, datetime
from typing import List, Optional
from sqlalchemy import select, func, update
from sqlalchemy.orm import Session
from src.notificaciones.models import Notificacion, TipoNotificacion
from src.notificaciones.constants import ENLACE_VENCIMIENTOS
from src.notificaciones import exceptions
from src.documentacion.vencimientos import buscar_vencimientos, DIAS_AVISO_VENCIMIENTO


# ---------- Consultas para la campanita ----------

def listar_notificaciones(db: Session, solo_no_leidas: bool = False, limite: int = 20) -> List[Notificacion]:
    query = select(Notificacion).order_by(Notificacion.fecha_creacion.desc()).limit(limite)
    if solo_no_leidas:
        query = query.where(Notificacion.leida == False)
    return db.scalars(query).all()

def contar_no_leidas(db: Session) -> int:
    return db.scalar(select(func.count()).select_from(Notificacion).where(Notificacion.leida == False))

def marcar_leida(db: Session, notificacion_id: int) -> Notificacion:
    notificacion = db.get(Notificacion, notificacion_id)
    if notificacion is None:
        raise exceptions.NotificacionNoEncontrada()
    notificacion.leida = True
    db.commit()
    db.refresh(notificacion)
    return notificacion

def marcar_todas_leidas(db: Session) -> int:
    resultado = db.execute(update(Notificacion).where(Notificacion.leida == False).values(leida=True))
    db.commit()
    return resultado.rowcount

# ---------- Ejecucion de avisos ----------

def _plural(cantidad: int, singular: str, plural: str) -> str:
    return f"{cantidad} {singular if cantidad == 1 else plural}"

def generar_aviso_vencimientos(db: Session, hoy: date | None = None) -> Optional[Notificacion]:

    hoy = hoy or date.today()
    clave_hoy = f"vencimientos-{hoy.isoformat()}"

    # Los avisos de días anteriores quedan obsoletos: el de hoy trae el estado actual
    db.execute(
        update(Notificacion)
        .where(
            Notificacion.tipo == TipoNotificacion.VENCIMIENTO_DOCUMENTACION,
            Notificacion.clave != clave_hoy,
            Notificacion.leida == False,
        )
        .values(leida=True)
    )

    vencimientos = buscar_vencimientos(db, hoy)
    if not vencimientos:
        db.commit()
        return None

    vencidos = sum(1 for v in vencimientos if v.fecha_vencimiento < hoy)
    por_vencer = len(vencimientos) - vencidos
    empleados = len({v.personal_id for v in vencimientos})

    detalle = []
    if vencidos:
        detalle.append(_plural(vencidos, "documento vencido", "documentos vencidos"))
    if por_vencer:
        detalle.append(f"{_plural(por_vencer, 'documento', 'documentos')} por vencer en los próximos {DIAS_AVISO_VENCIMIENTO} días")

    titulo = "Documentación para renovar"
    mensaje = f"{_plural(empleados, 'empleado tiene', 'empleados tienen')} {' y '.join(detalle)}."

    aviso = db.scalar(select(Notificacion).where(Notificacion.clave == clave_hoy))
    if aviso is None:
        aviso = Notificacion(
            clave=clave_hoy,
            tipo=TipoNotificacion.VENCIMIENTO_DOCUMENTACION,
            titulo=titulo,
            mensaje=mensaje,
            enlace=ENLACE_VENCIMIENTOS,
        )
        db.add(aviso)
    else:
        aviso.mensaje = mensaje

    db.commit()
    db.refresh(aviso)
    return aviso
