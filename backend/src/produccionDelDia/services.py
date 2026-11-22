from datetime import datetime

from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from src.equipos.models import Equipo
from src.exceptions import PermissionDenied
from src.loteProduccion.constants import ESTADOS_EN_CURSO
from src.loteProduccion.models import LoteProduccion
from src.loteProduccion.services import actualizar_estado_produccion
from src.personal.models import Personal
from src.produccionDelDia import exceptions, schemas
from src.produccionDelDia.constants import AccionPasoLote, EstadoPasoLote
from src.produccionDelDia.models import MovimientoPasoLote, PasoLote


def sector_del_paso(paso: PasoLote) -> int | None:
    return paso.equipo.sector_id if paso.equipo else None


def puede_operar_paso(paso: PasoLote, persona: Personal) -> bool:
    if persona.administrar or paso.lote.registrado_por_id == persona.id:
        return True
    sector = sector_del_paso(paso)
    return sector is not None and sector in persona.sector_ids


def puede_ver_lote(lote: LoteProduccion, persona: Personal) -> bool:
    return any(puede_operar_paso(paso, persona) for paso in lote.pasos) or (
        persona.administrar or lote.registrado_por_id == persona.id
    )


def _validar_acceso(lote: LoteProduccion, persona: Personal) -> None:
    if not puede_ver_lote(lote, persona):
        raise PermissionDenied()


def _validar_operable(paso: PasoLote, persona: Personal) -> None:
    if not puede_operar_paso(paso, persona):
        raise PermissionDenied()
    if paso.lote.estado not in ESTADOS_EN_CURSO or not paso.lote.activo:
        raise exceptions.LoteNoOperable()


def leer_paso(db: Session, paso_id: int) -> PasoLote:
    paso = db.get(PasoLote, paso_id)
    if paso is None:
        raise exceptions.PasoNoEncontrado()
    return paso


def paso_para(paso: PasoLote, persona: Personal) -> schemas.PasoLote:
    resumen = schemas.PasoLote.model_validate(paso)
    resumen.sector = paso.equipo.sector if paso.equipo else None
    resumen.puede_operar = puede_operar_paso(paso, persona)
    return resumen


def _resumen_lote(lote: LoteProduccion, persona: Personal) -> schemas.LoteDelDia:
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
        pasos=[paso_para(paso, persona) for paso in lote.pasos],
    )


def listar_produccion_del_dia(db: Session, persona: Personal) -> list[schemas.LoteDelDia]:
    query = (
        select(LoteProduccion)
        .where(
            LoteProduccion.estado.in_(ESTADOS_EN_CURSO),
            LoteProduccion.activo.is_(True),
            LoteProduccion.pasos.any(),
        )
        .order_by(LoteProduccion.fecha_produccion.desc(), LoteProduccion.id.desc())
    )
    if not persona.administrar:
        condiciones = [LoteProduccion.registrado_por_id == persona.id]
        if persona.sector_ids:
            condiciones.append(
                LoteProduccion.pasos.any(PasoLote.equipo.has(Equipo.sector_id.in_(persona.sector_ids)))
            )
        query = query.where(or_(*condiciones))
    return [_resumen_lote(lote, persona) for lote in db.scalars(query)]


def realizar_paso(
    db: Session,
    paso_id: int,
    persona: Personal,
    datos: schemas.RealizarPaso,
    foto_path: str | None = None,
) -> PasoLote:
    paso = leer_paso(db, paso_id)
    _validar_operable(paso, persona)
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
    actualizar_estado_produccion(paso.lote)
    db.commit()
    db.refresh(paso)
    return paso


def anular_paso(db: Session, paso_id: int, persona: Personal, datos: schemas.AnularPaso) -> PasoLote:
    paso = leer_paso(db, paso_id)
    _validar_operable(paso, persona)
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
    actualizar_estado_produccion(paso.lote)
    db.commit()
    db.refresh(paso)
    return paso


def pasos_del_lote(db: Session, lote_id: int, persona: Personal) -> list[PasoLote]:
    lote = db.get(LoteProduccion, lote_id)
    if lote is None:
        raise exceptions.LoteNoEncontrado()
    _validar_acceso(lote, persona)
    return lote.pasos
