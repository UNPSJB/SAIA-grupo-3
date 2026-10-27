from src.pagination import filtrar_ordenar
from datetime import date, datetime, time, timedelta
from typing import Any, Dict

from sqlalchemy import case, func, select
from sqlalchemy.orm import Session

from src.incidente import exceptions, models, schemas
from src.incidente.auditoria import (
    AccionMovimientoIncidente,
    MovimientoIncidente,
    registrar_movimiento,
)
from src.incidente.constants import (
    DIAS_ESTADISTICAS_MAXIMO,
    DIAS_ESTADISTICAS_POR_DEFECTO,
    AgrupacionPeriodo,
    EstadoIncidente,
)
from src.personal.models import Personal
from src.tipoIncidente import exceptions as tipo_incidente_exceptions
from src.tipoIncidente.models import TipoIncidente


def validar_reportante(db: Session, personal_dni: str) -> Personal:
    reportante = db.scalar(
        select(Personal).where(
            Personal.dni == personal_dni,
            Personal.activo == True,
            Personal.operar == True,
        )
    )
    if reportante is None:
        raise exceptions.OperadorNoValido()
    return reportante


def _validar_tipo(
    db: Session, tipo_id: int, tipo_actual_id: int | None = None
) -> None:
    """El tipo debe existir; si está dado de baja, solo se acepta el que ya usa el incidente."""
    query = select(TipoIncidente).where(
        TipoIncidente.id == tipo_id,
        (TipoIncidente.activo == True) | (TipoIncidente.id == tipo_actual_id),
    )
    if db.scalar(query) is None:
        raise tipo_incidente_exceptions.TipoIncidenteNoEncontrado()


def crear_incidente(
    db: Session,
    incidente: schemas.IncidenteCreate,
    reportado_por_dni: str,
    imagen_path: str | None = None,
) -> models.Incidente:
    reportante = validar_reportante(db, reportado_por_dni)
    _validar_tipo(db, incidente.tipo_id)
    db_incidente = models.Incidente(
        descripcion=incidente.descripcion,
        tipo_id=incidente.tipo_id,
        reportado_por_dni=reportado_por_dni,
        imagen_path=imagen_path,
    )
    db.add(db_incidente)
    db.flush()  
    registrar_movimiento(
        db, db_incidente.id, AccionMovimientoIncidente.REPORTADO, reportante.id
    )
    db.commit()
    db.refresh(db_incidente)
    return db_incidente


def listar_incidentes(
    db: Session,
    page: int = 1,
    size: int = 10,
    buscar: str = "",
    ordenar_por: str = "fecha_hora",
    orden: str = "desc",
    reportado_por_dni: str | None = None,
    estado: EstadoIncidente | None = None,
    fecha_desde: date | None = None,
    fecha_hasta: date | None = None,
    tipo_id: int | None = None,
) -> Dict[str, Any]:
    skip = (page - 1) * size
    query = select(models.Incidente).order_by(models.Incidente.fecha_hora.desc())
    if reportado_por_dni is not None:
        query = query.where(models.Incidente.reportado_por_dni == reportado_por_dni)
    if estado is not None:
        query = query.where(models.Incidente.estado == estado)
    if tipo_id is not None:
        query = query.where(models.Incidente.tipo_id == tipo_id)
    if fecha_desde is not None:
        query = query.where(
            models.Incidente.fecha_hora >= datetime.combine(fecha_desde, time.min)
        )
    if fecha_hasta is not None:
        query = query.where(
            models.Incidente.fecha_hora
            < datetime.combine(fecha_hasta + timedelta(days=1), time.min)
        )
    query = filtrar_ordenar(query, models.Incidente, buscar, [models.Incidente.descripcion, models.Incidente.reportado_por_dni], ordenar_por, orden, {"id": models.Incidente.id, "descripcion": models.Incidente.descripcion, "fecha_hora": models.Incidente.fecha_hora, "reportado_por_dni": models.Incidente.reportado_por_dni})
    total = db.scalar(select(func.count()).select_from(query.subquery()))
    items = db.scalars(query.offset(skip).limit(size)).all()
    pages = (total + size - 1) // size if total else 0
    return {"items": items, "total": total, "page": page, "size": size, "pages": pages}

def listar_incidentes_abiertos(
    db: Session,
    page: int = 1,
    size: int = 10,
    tipo_id: int | None = None,
    dias_minimos: int | None = None,
    buscar: str = "",
    ordenar_por: str = "fecha_hora",
    orden: str = "asc",
) -> Dict[str, Any]:
    """Incidentes sin acción correctiva vigente (estado abierto), ordenable y filtrable."""
    skip = (page - 1) * size
    query = select(models.Incidente).where(models.Incidente.estado == EstadoIncidente.ABIERTO)

    if tipo_id is not None:
        query = query.where(models.Incidente.tipo_id == tipo_id)
    if dias_minimos is not None:
        limite = datetime.now() - timedelta(days=dias_minimos)
        query = query.where(models.Incidente.fecha_hora <= limite)

    query = filtrar_ordenar(
        query,
        models.Incidente,
        buscar,
        [models.Incidente.descripcion, models.Incidente.reportado_por_dni],
        ordenar_por,
        orden,
        {
            "id": models.Incidente.id,
            "descripcion": models.Incidente.descripcion,
            "fecha_hora": models.Incidente.fecha_hora,
            "reportado_por_dni": models.Incidente.reportado_por_dni,
        },
    )

    total = db.scalar(select(func.count()).select_from(query.subquery()))
    items = db.scalars(query.offset(skip).limit(size)).all()
    pages = (total + size - 1) // size if total else 0
    return {"items": items, "total": total, "page": page, "size": size, "pages": pages}


def contar_abiertos_por_tipo(db: Session) -> list[schemas.CantidadPorTipo]:
    """Incidentes abiertos de cada tipo del maestro (incluye tipos en 0, activos o
    dados de baja: nada debe desaparecer del tablero)."""
    filas = db.execute(
        select(TipoIncidente, func.count(models.Incidente.id))
        .outerjoin(
            models.Incidente,
            (models.Incidente.tipo_id == TipoIncidente.id)
            & (models.Incidente.estado == EstadoIncidente.ABIERTO),
        )
        .group_by(TipoIncidente.id)
        .order_by(TipoIncidente.id)
    ).all()
    return [
        schemas.CantidadPorTipo(tipo=tipo, cantidad=cantidad)
        for tipo, cantidad in filas
    ]


def _agrupacion_para(dias: int) -> AgrupacionPeriodo:
    """Elige el agrupamiento para que el gráfico de evolución sea legible."""
    if dias <= 31:
        return AgrupacionPeriodo.DIA
    if dias <= 182:
        return AgrupacionPeriodo.SEMANA
    return AgrupacionPeriodo.MES


def _inicio_periodo(dia: date, agrupacion: AgrupacionPeriodo) -> date:
    if agrupacion == AgrupacionPeriodo.SEMANA:
        return dia - timedelta(days=dia.weekday())
    if agrupacion == AgrupacionPeriodo.MES:
        return dia.replace(day=1)
    return dia


def _siguiente_periodo(inicio: date, agrupacion: AgrupacionPeriodo) -> date:
    if agrupacion == AgrupacionPeriodo.SEMANA:
        return inicio + timedelta(days=7)
    if agrupacion == AgrupacionPeriodo.MES:
        return (inicio.replace(day=28) + timedelta(days=4)).replace(day=1)
    return inicio + timedelta(days=1)


def estadisticas_incidentes(
    db: Session,
    fecha_desde: date | None = None,
    fecha_hasta: date | None = None,
) -> schemas.EstadisticasIncidentes:
    """Cantidad de incidentes por tipo y por período entre dos fechas (inclusive).

    Sin fechas, toma los últimos 30 días. Los tipos activos aparecen aunque tengan
    0 incidentes; los dados de baja, solo si tienen incidentes en el período.
    """
    from src.accionCorrectiva.models import AccionCorrectiva  # evita import circular

    fecha_hasta = fecha_hasta or date.today()
    fecha_desde = fecha_desde or fecha_hasta - timedelta(days=DIAS_ESTADISTICAS_POR_DEFECTO - 1)
    if fecha_desde > fecha_hasta:
        raise exceptions.RangoFechasInvalido()
    dias = (fecha_hasta - fecha_desde).days + 1
    if dias > DIAS_ESTADISTICAS_MAXIMO:
        raise exceptions.RangoFechasExcedido()

    inicio = datetime.combine(fecha_desde, time.min)
    fin = datetime.combine(fecha_hasta + timedelta(days=1), time.min)
    en_periodo = (models.Incidente.fecha_hora >= inicio) & (models.Incidente.fecha_hora < fin)

    # Por tipo: un solo query con el total y los abiertos de cada tipo.
    abiertos_expr = func.sum(
        case((models.Incidente.estado == EstadoIncidente.ABIERTO, 1), else_=0)
    )
    filas = db.execute(
        select(TipoIncidente, func.count(models.Incidente.id), abiertos_expr)
        .outerjoin(
            models.Incidente,
            (models.Incidente.tipo_id == TipoIncidente.id) & en_periodo,
        )
        .group_by(TipoIncidente.id)
        .order_by(TipoIncidente.nombre)
    ).all()
    por_tipo = [
        schemas.EstadisticaPorTipo(
            tipo=tipo, total=total, abiertos=abiertos or 0, cerrados=total - (abiertos or 0)
        )
        for tipo, total, abiertos in filas
        if tipo.activo or total > 0
    ]
    total = sum(item.total for item in por_tipo)
    abiertos = sum(item.abiertos for item in por_tipo)

    # Evolución: se agrupa en Python para funcionar igual en SQLite y PostgreSQL.
    agrupacion = _agrupacion_para(dias)
    conteo: dict[date, int] = {}
    for fecha_hora in db.scalars(select(models.Incidente.fecha_hora).where(en_periodo)):
        clave = _inicio_periodo(fecha_hora.date(), agrupacion)
        conteo[clave] = conteo.get(clave, 0) + 1
    evolucion = []
    periodo = _inicio_periodo(fecha_desde, agrupacion)
    while periodo <= fecha_hasta:
        evolucion.append(schemas.EstadisticaPorPeriodo(periodo=periodo, cantidad=conteo.get(periodo, 0)))
        periodo = _siguiente_periodo(periodo, agrupacion)

    # Tiempo de resolución: desde el reporte hasta la acción correctiva vigente.
    resoluciones = db.execute(
        select(models.Incidente.fecha_hora, AccionCorrectiva.fecha_cierre)
        .join(AccionCorrectiva, AccionCorrectiva.incidente_id == models.Incidente.id)
        .where(
            en_periodo,
            models.Incidente.estado == EstadoIncidente.CERRADO,
            AccionCorrectiva.vigente == True,  # noqa: E712
        )
    ).all()
    promedio = None
    if resoluciones:
        segundos = sum(max((cierre - reporte).total_seconds(), 0) for reporte, cierre in resoluciones)
        promedio = round(segundos / len(resoluciones) / 3600, 1)

    return schemas.EstadisticasIncidentes(
        fecha_desde=fecha_desde,
        fecha_hasta=fecha_hasta,
        agrupacion=agrupacion,
        total=total,
        abiertos=abiertos,
        cerrados=total - abiertos,
        promedio_horas_resolucion=promedio,
        por_tipo=por_tipo,
        evolucion=evolucion,
    )


def leer_incidente(db: Session, incidente_id: int) -> models.Incidente:
    incidente = db.scalar(
        select(models.Incidente).where(models.Incidente.id == incidente_id)
    )
    if incidente is None:
        raise exceptions.IncidenteNoEncontrado()
    return incidente


def modificar_incidente(
    db: Session,
    incidente_id: int,
    incidente: schemas.IncidenteUpdate,
    imagen_path: str | None = None,
) -> models.Incidente:
    db_incidente = leer_incidente(db, incidente_id)
    _validar_tipo(db, incidente.tipo_id, tipo_actual_id=db_incidente.tipo_id)
    db_incidente.descripcion = incidente.descripcion
    db_incidente.tipo_id = incidente.tipo_id
    if incidente.estado is not None:
        db_incidente.estado = incidente.estado
    if imagen_path is not None:
        db_incidente.imagen_path = imagen_path
    db.commit()
    db.refresh(db_incidente)
    return db_incidente


def eliminar_incidente(db: Session, incidente_id: int) -> schemas.Incidente:
    incidente = leer_incidente(db, incidente_id)
    respuesta = schemas.Incidente.model_validate(incidente)
    db.delete(incidente)
    db.commit()
    return respuesta


def listar_movimientos(db: Session, incidente_id: int) -> list[MovimientoIncidente]:
    """Historial del incidente, del más antiguo al más reciente."""
    leer_incidente(db, incidente_id)
    return db.scalars(
        select(MovimientoIncidente)
        .where(MovimientoIncidente.incidente_id == incidente_id)
        .order_by(MovimientoIncidente.fecha_hora.asc(), MovimientoIncidente.id.asc())
    ).all()
