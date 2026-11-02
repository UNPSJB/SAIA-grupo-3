from datetime import date, datetime, timedelta
from typing import Any, Dict
from sqlalchemy import select, and_, func
from sqlalchemy.orm import Session
from src.registroTemperatura.models import RegistroTemperatura
from src.registroTemperatura import schemas, exceptions
from src.equipos.services import leer_equipo
from src.equipos.models import Equipo
from src.personal.models import Personal
from src.pagination import filtrar_ordenar
from src.notificaciones.models import Notificacion, TipoNotificacion

def registrar_temperatura(db: Session, datos: schemas.RegistroTemperaturaCreate, operario: Personal) -> RegistroTemperatura:
    equipo = leer_equipo(db, datos.equipo_id)

    if not equipo.controla_temperatura:
        raise exceptions.EquipoNoControlaTemp()

    if (equipo.temperatura_minima is None or equipo.temperatura_maxima is None
            or equipo.temperatura_minima >= equipo.temperatura_maxima):
        from fastapi import HTTPException
        raise HTTPException(409, "El equipo no tiene un rango de temperatura válido. Revisá su configuración.")

    # Cálculo automático de fuera de rango
    fuera_rango = (
        datos.temperatura_registrada < equipo.temperatura_minima or
        datos.temperatura_registrada > equipo.temperatura_maxima
    )

    if fuera_rango and not datos.accion_tomada:
        raise exceptions.AccionRequerida()

    registro = RegistroTemperatura(
        equipo_id=datos.equipo_id,
        operario_id=operario.id,
        temperatura_registrada=datos.temperatura_registrada,
        fuera_de_rango=fuera_rango,
        accion_tomada=datos.accion_tomada if fuera_rango else None
    )

    db.add(registro)

    if fuera_rango:
        clave_unica = f"temp-alerta-eq{equipo.id}-{datetime.now().strftime('%Y%m%d%H%M%S%f')}"
        notificacion = Notificacion(
            tipo=TipoNotificacion.TEMPERATURA_FUERA_RANGO,
            titulo="¡Alerta de Cadena de Frío!",
            mensaje=f"Equipo '{equipo.nombre}' fuera de rango ({datos.temperatura_registrada}°). Acción: {datos.accion_tomada}.",
            clave=clave_unica,
            enlace=f"/equipos/{equipo.id}"
        )
        db.add(notificacion)

    db.commit()
    db.refresh(registro)

    return registro


def listar_registros(
    db: Session,
    equipo_id: int | None = None,
    fecha_desde: date | None = None,
    fecha_hasta: date | None = None,
    solo_alertas: bool = False,
    page: int = 1,
    size: int = 10
) -> Dict[str, Any]:
    skip = (page - 1) * size
    query = select(RegistroTemperatura)

    if equipo_id:
        query = query.where(RegistroTemperatura.equipo_id == equipo_id)
    if fecha_desde:
        query = query.where(func.date(RegistroTemperatura.fecha_hora_registro) >= fecha_desde)
    if fecha_hasta:
        query = query.where(func.date(RegistroTemperatura.fecha_hora_registro) <= fecha_hasta)
    if solo_alertas:
        query = query.where(RegistroTemperatura.fuera_de_rango == True)

    query = query.order_by(RegistroTemperatura.fecha_hora_registro.desc())

    total = db.scalar(select(func.count()).select_from(query.subquery()))
    items = db.scalars(query.offset(skip).limit(size)).all()
    pages = (total + size - 1) // size if total else 0

    return {"items": items, "total": total, "page": page, "size": size, "pages": pages}

def equipos_pendientes_hoy(db: Session):
    hoy = date.today()
    equipos_frio = select(Equipo).where(
        and_(Equipo.activo == True, Equipo.controla_temperatura == True)
    ).subquery()

    registros_hoy = select(RegistroTemperatura.equipo_id).where(
        func.date(RegistroTemperatura.fecha_hora_registro) == hoy
    ).subquery()

    query = select(Equipo).where(
        and_(
            Equipo.id.in_(select(equipos_frio.c.id)),
            Equipo.id.not_in(select(registros_hoy))
        )
    )
    return db.scalars(query).all()
