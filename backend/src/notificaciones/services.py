from datetime import date, datetime
from typing import List, Optional, Union
from sqlalchemy import select, func, update, delete
from sqlalchemy.orm import Session
from src.notificaciones.models import Notificacion, TipoNotificacion
from src.notificaciones.constants import (
    ENLACE_VENCIMIENTOS,
    ENLACE_INSUMOS_STOCK_BAJO, 
    ENLACE_QUIMICOS_STOCK_BAJO,
)
from src.notificaciones import exceptions
from src.documentacion.vencimientos import buscar_vencimientos, DIAS_AVISO_VENCIMIENTO
from src.insumos.models import Insumo
from src.insumosQuimicos.models import InsumoQuimico

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

def generar_aviso_vencimientos(db: Session, hoy: date | None = None, *, confirmar: bool = True) -> Optional[Notificacion]:

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
        db.execute(delete(Notificacion).where(Notificacion.tipo == TipoNotificacion.VENCIMIENTO_DOCUMENTACION, Notificacion.clave == clave_hoy))
        if confirmar:
            db.commit()
        else:
            db.flush()
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
        if aviso.mensaje != mensaje:
            aviso.leida = False
        aviso.mensaje = mensaje
        aviso.enlace = ENLACE_VENCIMIENTOS

    if confirmar:
        db.commit()
    else:
        db.flush()
    db.refresh(aviso)
    return aviso

# ---------- Avisos de stock bajo ----------

def _datos_aviso_stock(insumo: Union[Insumo, InsumoQuimico]) -> tuple[str, str, str]:
    if isinstance(insumo, InsumoQuimico):
        return (
            f"stock-bajo-quimico-{insumo.id}",
            ENLACE_QUIMICOS_STOCK_BAJO,
            "insumo químico",
        )
    return (
        f"stock-bajo-insumo-{insumo.id}",
        ENLACE_INSUMOS_STOCK_BAJO,
        "insumo",
    )


def revisar_stock_insumo(
    db: Session,
    insumo: Union[Insumo, InsumoQuimico],
    *,
    confirmar: bool = True,
) -> Optional[Notificacion]:
    clave, enlace, etiqueta = _datos_aviso_stock(insumo)
    aviso = db.scalar(select(Notificacion).where(Notificacion.clave == clave))

    if not insumo.activo or insumo.stock_minimo is None or insumo.cantidad > insumo.stock_minimo:
        if aviso is not None and not aviso.resuelta:
            aviso.resuelta = True
            aviso.leida = True
            if confirmar:
                db.commit()
                db.refresh(aviso)
            else:
                db.flush()
        return None

    sufijo = insumo.unidadMedidaObj.sufijo if getattr(insumo, "unidadMedidaObj", None) else ""
    unidad = f" {sufijo}" if sufijo else ""
    titulo = f"Stock bajo: {insumo.nombre}"
    mensaje = (
        f"El {etiqueta} {insumo.nombre} alcanzó el stock mínimo "
        f"({insumo.cantidad:g}{unidad} disponibles, mínimo {insumo.stock_minimo:g}{unidad})."
    )

    from sqlalchemy.dialects.sqlite import insert
    db.flush()

    db.execute(insert(Notificacion).values(
        clave=clave, tipo=TipoNotificacion.STOCK_BAJO,
        titulo=titulo, mensaje=mensaje, enlace=enlace,
        leida=False, resuelta=False,
    ).on_conflict_do_nothing(index_elements=[Notificacion.clave]))
    db.execute(update(Notificacion).where(
        Notificacion.clave == clave, Notificacion.resuelta.is_(True),
    ).values(titulo=titulo, mensaje=mensaje, enlace=enlace,
             fecha_creacion=datetime.now(), leida=False, resuelta=False))
    aviso = db.scalar(select(Notificacion).where(Notificacion.clave == clave)
                      .execution_options(populate_existing=True))

    if confirmar:
        db.commit()
        db.refresh(aviso)
    else:
        db.flush()
    return aviso


def revisar_stock_todos(db: Session, *, confirmar: bool = True) -> List[Notificacion]:
    avisos: List[Notificacion] = []

    for insumo in db.scalars(select(Insumo)).all():
        aviso = revisar_stock_insumo(db, insumo, confirmar=False)
        if aviso is not None:
            avisos.append(aviso)

    for quimico in db.scalars(select(InsumoQuimico)).all():
        aviso = revisar_stock_insumo(db, quimico, confirmar=False)
        if aviso is not None:
            avisos.append(aviso)

    if confirmar:
        db.commit()
    else:
        db.flush()
    return avisos

def contar_stock_bajo(db: Session) -> dict[str, int]:
    def cantidad(modelo):
        return db.scalar(select(func.count()).select_from(modelo).where(
            modelo.activo.is_(True), modelo.stock_minimo.is_not(None),
            modelo.cantidad <= modelo.stock_minimo,
        )) or 0
    insumos, quimicos = cantidad(Insumo), cantidad(InsumoQuimico)
    return {"insumos": insumos, "insumos_quimicos": quimicos, "total": insumos + quimicos}
