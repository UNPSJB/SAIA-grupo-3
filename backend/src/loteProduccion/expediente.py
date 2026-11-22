from datetime import date, datetime, time, timedelta
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from src.equipos.models import Equipo
from src.incidente.models import Incidente
from src.loteProduccion.constants import TOLERANCIA_PUNTO_CONTROL_CELSIUS, EstadoLote, TipoAlerta
from src.loteProduccion.models import LoteProduccion
from src.loteProduccion.services import leer_lote, trazabilidad_lote_produccion
from src.personal.models import Personal
from src.produccionDelDia.constants import EstadoPasoLote
from src.produccionDelDia.models import PasoLote
from src.registroCalibracion.models import RegistroCalibracion
from src.registroTemperatura.models import RegistroTemperatura


def _nombre(persona: Personal | None) -> str:
    return f"{persona.apellido}, {persona.nombre}" if persona else "No informado"


def _numero(valor: float) -> str:
    return f"{valor:g}".replace(".", ",")


def _fecha(valor: date) -> str:
    return f"{valor:%d/%m/%Y}"


def _rango_del_dia(fecha: date) -> tuple[datetime, datetime]:
    inicio = datetime.combine(fecha, time.min)
    return inicio, inicio + timedelta(days=1)


def _fuera_de_rango(paso: PasoLote) -> bool:
    return (
        paso.punto_control
        and paso.estado == EstadoPasoLote.REALIZADO
        and paso.temperatura_celsius is not None
        and paso.valor_medido is not None
        and abs(paso.valor_medido - paso.temperatura_celsius) > TOLERANCIA_PUNTO_CONTROL_CELSIUS
    )


def _pasos(lote: LoteProduccion) -> list[dict[str, Any]]:
    return [
        {
            "orden": paso.orden,
            "nombre": paso.nombre,
            "equipo": paso.equipo.nombre if paso.equipo else None,
            "punto_control": paso.punto_control,
            "temperatura_esperada": paso.temperatura_celsius,
            "valor_medido": paso.valor_medido,
            "estado": paso.estado,
            "realizado_por": _nombre(paso.realizado_por) if paso.realizado_por else None,
            "realizado_en": paso.realizado_en,
            "fuera_de_rango": _fuera_de_rango(paso),
            "movimientos": [
                {
                    "accion": movimiento.accion,
                    "fecha_hora": movimiento.fecha_hora,
                    "personal": _nombre(movimiento.personal),
                    "valor_medido": movimiento.valor_medido,
                    "observacion": movimiento.observacion,
                    "motivo": movimiento.motivo,
                    "con_foto": movimiento.foto_path is not None,
                }
                for movimiento in paso.movimientos
            ],
        }
        for paso in lote.pasos
    ]


def _calibracion(db: Session, equipo: Equipo, fecha: date) -> dict[str, Any]:
    if equipo.periodicidad_dias is None:
        return {"requiere_calibracion": False}
    registro = db.scalar(
        select(RegistroCalibracion)
        .where(
            RegistroCalibracion.equipo_id == equipo.id,
            RegistroCalibracion.activo.is_(True),
            RegistroCalibracion.fecha_calibracion <= fecha,
        )
        .order_by(RegistroCalibracion.fecha_calibracion.desc(), RegistroCalibracion.id.desc())
        .limit(1)
    )
    if registro is None:
        return {"requiere_calibracion": True, "calibracion_vigente": False}
    vencimiento = registro.fecha_vencimiento_calculada
    return {
        "requiere_calibracion": True,
        "fecha_calibracion": registro.fecha_calibracion,
        "fecha_vencimiento": vencimiento,
        "calibracion_vigente": vencimiento is None or vencimiento >= fecha,
    }


def _equipos(db: Session, lote: LoteProduccion) -> list[dict[str, Any]]:
    pasos_por_equipo: dict[int, list[int]] = {}
    for paso in lote.pasos:
        if paso.equipo_id is not None:
            pasos_por_equipo.setdefault(paso.equipo_id, []).append(paso.orden)
    if not pasos_por_equipo:
        return []
    inicio, fin = _rango_del_dia(lote.fecha_produccion)
    temperaturas = db.scalars(
        select(RegistroTemperatura)
        .where(
            RegistroTemperatura.equipo_id.in_(pasos_por_equipo),
            RegistroTemperatura.fecha_hora_registro >= inicio,
            RegistroTemperatura.fecha_hora_registro < fin,
        )
        .order_by(RegistroTemperatura.fecha_hora_registro, RegistroTemperatura.id)
    ).all()
    equipos = db.scalars(
        select(Equipo).where(Equipo.id.in_(pasos_por_equipo)).order_by(Equipo.nombre, Equipo.id)
    ).all()
    return [
        {
            "equipo_id": equipo.id,
            "nombre": equipo.nombre,
            "pasos": pasos_por_equipo[equipo.id],
            **_calibracion(db, equipo, lote.fecha_produccion),
            "temperaturas": [
                {
                    "fecha_hora": registro.fecha_hora_registro,
                    "temperatura": registro.temperatura_registrada,
                    "fuera_de_rango": registro.fuera_de_rango,
                    "operario": _nombre(registro.operario),
                }
                for registro in temperaturas
                if registro.equipo_id == equipo.id
            ],
        }
        for equipo in equipos
    ]


def _incidentes(db: Session, fecha: date) -> list[dict[str, Any]]:
    inicio, fin = _rango_del_dia(fecha)
    incidentes = db.scalars(
        select(Incidente)
        .where(Incidente.fecha_hora >= inicio, Incidente.fecha_hora < fin)
        .order_by(Incidente.fecha_hora, Incidente.id)
    ).all()
    return [
        {
            "id": incidente.id,
            "fecha_hora": incidente.fecha_hora,
            "tipo": incidente.tipo.nombre,
            "descripcion": incidente.descripcion,
            "estado": incidente.estado,
            "reportado_por": _nombre(incidente.reportado_por),
        }
        for incidente in incidentes
    ]


def _alertas(
    lote: LoteProduccion, insumos: list[dict[str, Any]], equipos: list[dict[str, Any]]
) -> list[dict[str, Any]]:
    alertas = []

    def agregar(tipo: TipoAlerta, mensaje: str) -> None:
        alertas.append({"tipo": tipo, "mensaje": mensaje})

    for paso in lote.pasos:
        if _fuera_de_rango(paso):
            agregar(
                TipoAlerta.PUNTO_CONTROL_FUERA_DE_RANGO,
                f"Paso {paso.orden} «{paso.nombre}»: se esperaban {_numero(paso.temperatura_celsius)} °C "
                f"y se midieron {_numero(paso.valor_medido)} °C.",
            )
    for equipo in equipos:
        if equipo["requiere_calibracion"] and not equipo["calibracion_vigente"]:
            detalle = (
                f"tenía la calibración vencida desde el {_fecha(equipo['fecha_vencimiento'])}"
                if equipo.get("fecha_vencimiento")
                else "no tenía calibración registrada"
            )
            pasos = ", ".join(str(orden) for orden in equipo["pasos"])
            agregar(
                TipoAlerta.CALIBRACION_VENCIDA,
                f"{equipo['nombre']} {detalle} al producir el lote (paso {pasos}).",
            )
    for insumo in insumos:
        for recepcion in insumo["lotes_recepcion"]:
            if recepcion["fecha_vencimiento"] < lote.fecha_produccion:
                agregar(
                    TipoAlerta.INSUMO_VENCIDO,
                    f"{insumo['insumo_nombre']}, lote {recepcion['numero_lote']}: venció el "
                    f"{_fecha(recepcion['fecha_vencimiento'])} y se usó el {_fecha(lote.fecha_produccion)}.",
                )
            if recepcion["fecha_recepcion"] > lote.fecha_produccion:
                agregar(
                    TipoAlerta.INSUMO_RECIBIDO_DESPUES,
                    f"{insumo['insumo_nombre']}, lote {recepcion['numero_lote']}: se recibió el "
                    f"{_fecha(recepcion['fecha_recepcion'])}, después de la producción.",
                )
        sin_origen = insumo["cantidad_stock_anterior"] + insumo["cantidad_historica_sin_origen"]
        if sin_origen > 0:
            agregar(
                TipoAlerta.INSUMO_SIN_ORIGEN,
                f"{_numero(sin_origen)} {insumo['unidad']} de {insumo['insumo_nombre']} "
                "no tienen lote de recepción identificado.",
            )
    if lote.pasos_pendientes_al_cerrar:
        agregar(
            TipoAlerta.CIERRE_CON_PASOS_PENDIENTES,
            f"El lote se cerró con {lote.pasos_pendientes_al_cerrar} paso(s) sin realizar. "
            f"Motivo: {lote.motivo_cierre_pendientes or '—'}",
        )
    if lote.estado == EstadoLote.ANULADO:
        agregar(TipoAlerta.LOTE_ANULADO, f"El lote fue anulado. Motivo: {lote.motivo_anulacion or '—'}")
    return alertas


def expediente_lote(db: Session, lote_id: int) -> dict[str, Any]:
    lote = leer_lote(db, lote_id)
    insumos = trazabilidad_lote_produccion(db, lote_id)["insumos"]
    equipos = _equipos(db, lote)
    return {
        "lote": lote,
        "insumos": insumos,
        "pasos": _pasos(lote),
        "equipos": equipos,
        "incidentes": _incidentes(db, lote.fecha_produccion),
        "alertas": _alertas(lote, insumos, equipos),
    }
