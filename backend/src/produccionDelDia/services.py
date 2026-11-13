from datetime import datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from src.exceptions import PermissionDenied
from src.loteProduccion.constants import EstadoLote
from src.loteProduccion.models import LoteProduccion
from src.personal.models import Personal
from src.produccionDelDia import exceptions, schemas
from src.produccionDelDia.constants import AccionPasoLote, EstadoPasoLote
from src.produccionDelDia.models import MovimientoPasoLote, PasoLote


def _validar_acceso(lote: LoteProduccion, persona: Personal) -> None:
    if not persona.administrar and lote.registrado_por_id != persona.id:
        raise PermissionDenied()


def _validar_operable(lote: LoteProduccion, persona: Personal) -> None:
    _validar_acceso(lote, persona)
    if lote.estado != EstadoLote.ABIERTO or not lote.activo:
        raise exceptions.LoteNoOperable()


def leer_paso(db: Session, paso_id: int) -> PasoLote:
    paso = db.get(PasoLote, paso_id)
    if paso is None:
        raise exceptions.PasoNoEncontrado()
    return paso


def _resumen_lote(lote: LoteProduccion) -> schemas.LoteDelDia:
    version = lote.version_receta
    return schemas.LoteDelDia(
        id=lote.id,
        codigo=lote.codigo,
        producto=lote.producto,
        fecha_produccion=lote.fecha_produccion,
        cantidad=lote.cantidad,
        unidad=lote.producto.unidad_medida.sufijo,
        registrado_por=lote.registrado_por,
        version_numero=version.numero if version else None,
        receta_id=version.receta_id if version else None,
        realizados=sum(1 for paso in lote.pasos if paso.estado == EstadoPasoLote.REALIZADO),
        total=len(lote.pasos),
        pasos=lote.pasos,
    )


def listar_produccion_del_dia(db: Session, persona: Personal) -> list[schemas.LoteDelDia]:
    query = (
        select(LoteProduccion)
        .where(
            LoteProduccion.estado == EstadoLote.ABIERTO,
            LoteProduccion.activo.is_(True),
            LoteProduccion.pasos.any(),
        )
        .order_by(LoteProduccion.fecha_produccion.desc(), LoteProduccion.id.desc())
    )
    if not persona.administrar:
        query = query.where(LoteProduccion.registrado_por_id == persona.id)
    return [_resumen_lote(lote) for lote in db.scalars(query)]


def realizar_paso(
    db: Session,
    paso_id: int,
    persona: Personal,
    datos: schemas.RealizarPaso,
    foto_path: str | None = None,
) -> PasoLote:
    paso = leer_paso(db, paso_id)
    _validar_operable(paso.lote, persona)
    if paso.estado == EstadoPasoLote.REALIZADO:
        raise exceptions.PasoYaRealizado()
    if paso.punto_control and datos.valor_medido is None:
        raise exceptions.ValorMedidoObligatorio()
    ahora = datetime.now()
    paso.estado = EstadoPasoLote.REALIZADO
    paso.realizado_por_id = persona.id
    paso.realizado_en = ahora
    paso.valor_medido = datos.valor_medido
    paso.observacion = datos.observacion
    paso.foto_path = foto_path
    paso.movimientos.append(
        MovimientoPasoLote(
            accion=AccionPasoLote.REALIZADO,
            personal_id=persona.id,
            fecha_hora=ahora,
            valor_medido=datos.valor_medido,
            observacion=datos.observacion,
            foto_path=foto_path,
        )
    )
    db.commit()
    db.refresh(paso)
    return paso


def anular_paso(db: Session, paso_id: int, persona: Personal, datos: schemas.AnularPaso) -> PasoLote:
    paso = leer_paso(db, paso_id)
    _validar_operable(paso.lote, persona)
    if paso.estado != EstadoPasoLote.REALIZADO:
        raise exceptions.PasoNoRealizado()
    paso.estado = EstadoPasoLote.PENDIENTE
    paso.realizado_por_id = None
    paso.realizado_en = None
    paso.valor_medido = None
    paso.observacion = None
    paso.foto_path = None
    paso.movimientos.append(
        MovimientoPasoLote(
            accion=AccionPasoLote.ANULADO,
            personal_id=persona.id,
            fecha_hora=datetime.now(),
            motivo=datos.motivo,
        )
    )
    db.commit()
    db.refresh(paso)
    return paso


def pasos_del_lote(db: Session, lote_id: int, persona: Personal) -> list[PasoLote]:
    lote = db.get(LoteProduccion, lote_id)
    if lote is None:
        raise exceptions.LoteNoEncontrado()
    _validar_acceso(lote, persona)
    return lote.pasos
