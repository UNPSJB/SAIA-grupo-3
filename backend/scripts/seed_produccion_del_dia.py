"""Pasos de elaboración de los lotes demo, generados desde la receta vigente de cada producto."""

from datetime import datetime, time, timedelta

from sqlalchemy import select

from src.loteProduccion.constants import EstadoLote
from src.loteProduccion.models import LoteProduccion
from src.produccionDelDia.constants import AccionPasoLote, EstadoPasoLote
from src.produccionDelDia.models import MovimientoPasoLote, PasoLote
from src.receta.models import Receta

LOTE_CERRADO_CON_PENDIENTES = "L-SEED-009"
LOTE_CON_ANULACION = "L-SEED-001"


def _momento(lote, orden):
    return datetime.combine(lote.fecha_produccion, time(8, 0)) + timedelta(minutes=25 * orden)


def _valor_medido(paso):
    return paso.temperatura_celsius if paso.temperatura_celsius is not None else 75.0


def cargar_pasos_lotes(db, crear):
    lotes = db.scalars(
        select(LoteProduccion).where(LoteProduccion.codigo.like("L-SEED-%")).order_by(LoteProduccion.codigo)
    ).all()
    for lote in lotes:
        receta = db.scalar(select(Receta).where(Receta.producto_id == lote.producto_id))
        version = receta.version_vigente if receta else None
        if version is None or not version.pasos:
            continue
        if lote.version_receta_id is None:
            lote.version_receta_id = version.id
            lote.factor_receta = round(lote.cantidad / version.rendimiento_cantidad, 3)
        cerrado = lote.estado == EstadoLote.CERRADO
        total = len(version.pasos)
        hechos = total - 1 if lote.codigo == LOTE_CERRADO_CON_PENDIENTES else total if cerrado else total // 2
        for paso_receta in version.pasos:
            realizado = paso_receta.orden <= hechos
            momento = _momento(lote, paso_receta.orden)
            valor = _valor_medido(paso_receta) if realizado and paso_receta.punto_control else None
            paso, nuevo = crear(
                PasoLote,
                {"lote_id": lote.id, "orden": paso_receta.orden},
                paso_receta_id=paso_receta.id,
                nombre=paso_receta.nombre,
                procedimiento=paso_receta.procedimiento,
                equipo_id=paso_receta.equipo_id,
                tiempo_minutos=paso_receta.tiempo_minutos,
                temperatura_celsius=paso_receta.temperatura_celsius,
                punto_control=paso_receta.punto_control,
                estado=EstadoPasoLote.REALIZADO if realizado else EstadoPasoLote.PENDIENTE,
                realizado_por_id=lote.registrado_por_id if realizado else None,
                realizado_en=momento if realizado else None,
                valor_medido=valor,
            )
            if not nuevo or not realizado:
                continue
            if lote.codigo == LOTE_CON_ANULACION and paso_receta.orden == 1:
                antes = momento - timedelta(minutes=10)
                crear(MovimientoPasoLote, {"paso_id": paso.id, "fecha_hora": antes - timedelta(minutes=5)},
                      accion=AccionPasoLote.REALIZADO, personal_id=lote.registrado_por_id)
                crear(MovimientoPasoLote, {"paso_id": paso.id, "fecha_hora": antes},
                      accion=AccionPasoLote.ANULADO, personal_id=lote.registrado_por_id,
                      motivo="Se marcó antes de terminar de pesar.")
            crear(MovimientoPasoLote, {"paso_id": paso.id, "fecha_hora": momento},
                  accion=AccionPasoLote.REALIZADO, personal_id=lote.registrado_por_id, valor_medido=valor)
        if lote.codigo == LOTE_CERRADO_CON_PENDIENTES and lote.pasos_pendientes_al_cerrar is None:
            lote.pasos_pendientes_al_cerrar = total - hechos
            lote.motivo_cierre_pendientes = "Corte de luz: el último paso se completó fuera del sistema."
