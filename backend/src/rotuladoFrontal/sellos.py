from datetime import datetime
from typing import Optional

from sqlalchemy import select
from sqlalchemy.orm import Session

from src.nutricion.calculo import obtener_o_calcular
from src.nutricion.constants import Nutriente
from src.nutricion.models import InformacionNutricionalVersion
from src.personal.models import Personal
from src.rotuladoFrontal import exceptions, schemas
from src.rotuladoFrontal.aplicabilidad import leer_producto, registro_aplicabilidad, version_vigente
from src.rotuladoFrontal.constants import (
    NUTRIENTES_EVALUABLES,
    Aviso,
    ErrorCode,
    Hecho,
    ResultadoAplicabilidad,
)
from src.rotuladoFrontal.models import AplicabilidadProducto, CalculoSellos
from src.rotuladoFrontal.motor import EntradaSellos, evaluar_sellos, simbolo
from src.rotuladoFrontal.services import conjunto_vigente


def _motivo_desactualizada(db: Session, registro: AplicabilidadProducto, version) -> Optional[str]:
    vigente = conjunto_vigente(db)
    if registro.conjunto_id != vigente.id:
        return f"se publicó la versión {vigente.numero} de los parámetros."
    if version is not None and registro.version_receta_id != version.id:
        return f"la receta vigente ahora es la versión {version.numero}."
    return None


def _impedimento(db: Session, producto_id: int) -> tuple[Optional[str], Optional[AplicabilidadProducto], object]:
    registro = registro_aplicabilidad(db, producto_id)
    version = version_vigente(db, producto_id)
    if registro is None or registro.resultado is None:
        return ErrorCode.SIN_APLICABILIDAD, registro, version
    if registro.resultado != ResultadoAplicabilidad.CORRESPONDE:
        return ErrorCode.NO_SE_CALCULA.format(mensaje=registro.mensaje), registro, version
    if version is None:
        return ErrorCode.SIN_RECETA, registro, version
    motivo = _motivo_desactualizada(db, registro, version)
    if motivo:
        return ErrorCode.APLICABILIDAD_DESACTUALIZADA.format(motivo=motivo), registro, version
    return None, registro, version


def calcular_sellos(db: Session, producto_id: int, persona: Personal) -> CalculoSellos:
    leer_producto(db, producto_id)
    impedimento, registro, version = _impedimento(db, producto_id)
    if impedimento:
        raise exceptions.CalculoNoPermitido(impedimento)
    conjunto = conjunto_vigente(db)
    informacion = obtener_o_calcular(db, version)
    calculados = {fila.nutriente: fila for fila in informacion.valores}
    por_100 = {n: (calculados[n].por_100 if n in calculados else None) for n in NUTRIENTES_EVALUABLES}
    energia = calculados.get(Nutriente.ENERGIA)
    energia_porcion = energia.por_porcion if energia is not None else None
    hechos = {Hecho(h) for h in registro.hechos}
    resultado = evaluar_sellos(
        conjunto.umbrales,
        conjunto.advertencias,
        EntradaSellos(tipo=registro.tipo_producto, por_100=por_100, energia_porcion=energia_porcion, hechos=hechos),
    )
    calculo = CalculoSellos(
        producto_id=producto_id,
        version_receta_id=version.id,
        conjunto_id=conjunto.id,
        tipo_producto=registro.tipo_producto,
        base=informacion.base.value if informacion.base else None,
        provisorio=not informacion.completa,
        faltantes=[f["mensaje"] if isinstance(f, dict) else f for f in informacion.faltantes],
        entrada={**{n.value: v for n, v in por_100.items()}, "energia_porcion": energia_porcion},
        hechos=[h.value for h in Hecho if h in hechos],
        sellos=[s.value for s in resultado.sellos],
        leyendas=resultado.leyendas,
        advertencias=resultado.advertencias,
        detalle=[
            schemas.DetalleUmbral(**vars(d), simbolo=simbolo(d.comparacion)).model_dump(mode="json")
            for d in resultado.detalle
        ],
        calculado_por_id=persona.id,
        calculado_en=datetime.now(),
    )
    db.add(calculo)
    db.flush()
    return calculo


def leer_calculo(db: Session, calculo_id: int) -> CalculoSellos:
    calculo = db.get(CalculoSellos, calculo_id)
    if calculo is None:
        raise exceptions.CalculoNoEncontrado()
    return calculo


def a_schema(calculo: CalculoSellos) -> schemas.CalculoSellos:
    version = calculo.version_receta
    return schemas.CalculoSellos(
        id=calculo.id,
        producto_id=calculo.producto_id,
        version_receta=schemas.RecetaEvaluada(receta_id=version.receta_id, version_id=version.id, numero=version.numero),
        conjunto=schemas.ConjuntoReferencia.model_validate(calculo.conjunto),
        tipo_producto=calculo.tipo_producto,
        base=calculo.base,
        provisorio=calculo.provisorio,
        faltantes=calculo.faltantes,
        entrada=calculo.entrada,
        hechos=[Hecho(h) for h in calculo.hechos],
        sellos=calculo.sellos,
        leyendas=calculo.leyendas,
        advertencias=calculo.advertencias,
        detalle=[schemas.DetalleUmbral.model_validate(d) for d in calculo.detalle],
        calculado_por=calculo.calculado_por,
        calculado_en=calculo.calculado_en,
    )


def _avisos(db: Session, calculo: CalculoSellos, registro, version) -> list[str]:
    avisos = []
    if version is not None and calculo.version_receta_id != version.id:
        avisos.append(Aviso.SELLOS_RECETA_NUEVA.format(numero=version.numero))
    vigente = conjunto_vigente(db)
    if calculo.conjunto_id != vigente.id:
        avisos.append(Aviso.SELLOS_PARAMETROS_NUEVOS.format(numero=vigente.numero))
    if registro is not None and registro.evaluado_en and registro.evaluado_en > calculo.calculado_en:
        avisos.append(Aviso.SELLOS_APLICABILIDAD_NUEVA)
    informacion = db.scalar(
        select(InformacionNutricionalVersion).where(
            InformacionNutricionalVersion.version_id == calculo.version_receta_id
        )
    )
    if informacion is not None and informacion.calculada_en > calculo.calculado_en:
        avisos.append(Aviso.SELLOS_NUTRICION_NUEVA)
    return avisos


def obtener_sellos(db: Session, producto_id: int) -> schemas.SellosProducto:
    producto = leer_producto(db, producto_id)
    impedimento, registro, version = _impedimento(db, producto_id)
    calculos = db.scalars(
        select(CalculoSellos).where(CalculoSellos.producto_id == producto_id).order_by(CalculoSellos.id.desc())
    ).all()
    ultimo = calculos[0] if calculos else None
    aplicabilidad = None
    if registro is not None and registro.resultado is not None:
        aplicabilidad = schemas.Aplicabilidad(
            resultado=registro.resultado, mensaje=registro.mensaje, regla_orden=registro.regla_orden
        )
    mostrar = ultimo if ultimo is not None and not (
        registro is not None and registro.resultado not in (None, ResultadoAplicabilidad.CORRESPONDE)
    ) else None
    return schemas.SellosProducto(
        producto=producto,
        aplicabilidad=aplicabilidad,
        puede_calcular=impedimento is None,
        motivo_no_calcula=impedimento,
        calculo=a_schema(mostrar) if mostrar else None,
        avisos=_avisos(db, mostrar, registro, version) if mostrar else [],
        historial=[
            schemas.CalculoResumen(
                id=c.id,
                conjunto_numero=c.conjunto.numero,
                receta_numero=c.version_receta.numero,
                sellos=c.sellos,
                provisorio=c.provisorio,
                calculado_en=c.calculado_en,
            )
            for c in calculos
        ],
    )


def guardar_calculo(db: Session, producto_id: int, persona: Personal) -> schemas.SellosProducto:
    calcular_sellos(db, producto_id, persona)
    db.commit()
    return obtener_sellos(db, producto_id)
