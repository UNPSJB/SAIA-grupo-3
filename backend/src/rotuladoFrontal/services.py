from datetime import datetime
from typing import Optional

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from src.personal.models import Personal
from src.rotuladoFrontal import exceptions, schemas
from src.rotuladoFrontal.constants import ErrorCode, EstadoConjunto, OperadorRegla, ResultadoAplicabilidad
from src.rotuladoFrontal.models import AdvertenciaPrecautoria, ConjuntoParametros, ReglaAplicabilidad, UmbralSello
from src.rotuladoFrontal.motor import EntradaSellos, evaluar_aplicabilidad, evaluar_sellos, simbolo

CAMPOS_UMBRAL = (
    "sello",
    "leyenda",
    "nutriente",
    "formula",
    "factor_energetico",
    "limite",
    "unidad",
    "comparacion",
    "aplica_a",
    "requiere_agregado",
    "requiere_alguno_de",
    "energia_maxima_porcion",
    "nota",
)


def listar_conjuntos(db: Session) -> list[ConjuntoParametros]:
    return list(db.scalars(select(ConjuntoParametros).order_by(ConjuntoParametros.numero.desc())).all())


def leer_conjunto(db: Session, conjunto_id: int) -> ConjuntoParametros:
    conjunto = db.get(ConjuntoParametros, conjunto_id)
    if conjunto is None:
        raise exceptions.ConjuntoNoEncontrado()
    return conjunto


def conjunto_vigente(db: Session) -> ConjuntoParametros:
    conjunto = db.scalar(select(ConjuntoParametros).where(ConjuntoParametros.estado == EstadoConjunto.VIGENTE))
    if conjunto is None:
        raise exceptions.SinConjuntoVigente()
    return conjunto


def conjunto_para_calculo(db: Session, conjunto_id: Optional[int] = None) -> ConjuntoParametros:
    return leer_conjunto(db, conjunto_id) if conjunto_id is not None else conjunto_vigente(db)


def _umbrales(datos) -> list[UmbralSello]:
    return [
        UmbralSello(
            orden=orden,
            **{campo: getattr(umbral, campo) for campo in CAMPOS_UMBRAL},
        )
        for orden, umbral in enumerate(datos, start=1)
    ]


def _reglas(datos) -> list[ReglaAplicabilidad]:
    return [
        ReglaAplicabilidad(
            orden=orden,
            operador=regla.operador,
            hechos=[str(h) for h in regla.hechos],
            resultado=regla.resultado,
            mensaje=regla.mensaje,
        )
        for orden, regla in enumerate(datos, start=1)
    ]


def _advertencias(datos) -> list[AdvertenciaPrecautoria]:
    return [
        AdvertenciaPrecautoria(orden=orden, hecho=advertencia.hecho, texto=advertencia.texto)
        for orden, advertencia in enumerate(datos, start=1)
    ]


def _normalizar(umbrales: list[UmbralSello]) -> None:
    for umbral in umbrales:
        umbral.requiere_alguno_de = [str(s) for s in umbral.requiere_alguno_de]


def _borrador_existente(db: Session) -> Optional[ConjuntoParametros]:
    return db.scalar(select(ConjuntoParametros).where(ConjuntoParametros.estado == EstadoConjunto.BORRADOR))


def crear_conjunto(
    db: Session,
    datos: schemas.ConjuntoDatos,
    persona: Optional[Personal],
    estado: EstadoConjunto = EstadoConjunto.BORRADOR,
) -> ConjuntoParametros:
    numero = (db.scalar(select(func.max(ConjuntoParametros.numero))) or 0) + 1
    ahora = datetime.now()
    conjunto = ConjuntoParametros(
        numero=numero,
        estado=estado,
        nombre=datos.nombre,
        norma_origen=datos.norma_origen,
        fecha_vigencia=datos.fecha_vigencia,
        motivo=datos.motivo,
        creado_por_id=persona.id if persona else None,
        creado_en=ahora,
        publicado_por_id=persona.id if persona and estado == EstadoConjunto.VIGENTE else None,
        publicado_en=ahora if estado == EstadoConjunto.VIGENTE else None,
        umbrales=_umbrales(datos.umbrales),
        reglas=_reglas(datos.reglas),
        advertencias=_advertencias(datos.advertencias),
    )
    _normalizar(conjunto.umbrales)
    db.add(conjunto)
    db.flush()
    return conjunto


def nueva_version(db: Session, datos: schemas.NuevaVersion, persona: Personal) -> ConjuntoParametros:
    borrador = _borrador_existente(db)
    if borrador is not None:
        raise exceptions.BorradorExistente(borrador.numero)
    base = conjunto_para_calculo(db, datos.version_base_id)
    copia = schemas.ConjuntoDatos(
        nombre=base.nombre,
        norma_origen=base.norma_origen,
        fecha_vigencia=None,
        motivo=datos.motivo,
        umbrales=[schemas.UmbralDatos.model_validate(u, from_attributes=True) for u in base.umbrales],
        reglas=[schemas.ReglaDatos.model_validate(r, from_attributes=True) for r in base.reglas],
        advertencias=[schemas.AdvertenciaDatos.model_validate(a, from_attributes=True) for a in base.advertencias],
    )
    conjunto = crear_conjunto(db, copia, persona)
    conjunto.version_base_id = base.id
    db.commit()
    db.refresh(conjunto)
    return conjunto


def _editable(conjunto: ConjuntoParametros) -> None:
    if conjunto.estado != EstadoConjunto.BORRADOR:
        raise exceptions.ConjuntoNoEditable(conjunto.numero)


def actualizar_borrador(db: Session, conjunto_id: int, datos: schemas.ConjuntoDatos) -> ConjuntoParametros:
    conjunto = leer_conjunto(db, conjunto_id)
    _editable(conjunto)
    conjunto.nombre = datos.nombre
    conjunto.norma_origen = datos.norma_origen
    conjunto.fecha_vigencia = datos.fecha_vigencia
    conjunto.motivo = datos.motivo
    conjunto.umbrales.clear()
    conjunto.reglas.clear()
    conjunto.advertencias.clear()
    db.flush()
    conjunto.umbrales.extend(_umbrales(datos.umbrales))
    conjunto.reglas.extend(_reglas(datos.reglas))
    conjunto.advertencias.extend(_advertencias(datos.advertencias))
    _normalizar(conjunto.umbrales)
    db.commit()
    db.refresh(conjunto)
    return conjunto


def validar_publicable(conjunto: ConjuntoParametros) -> None:
    if not conjunto.umbrales:
        raise exceptions.ConjuntoInvalido(ErrorCode.SIN_UMBRALES)
    if not conjunto.reglas or conjunto.reglas[-1].operador != OperadorRegla.SIEMPRE:
        raise exceptions.ConjuntoInvalido(ErrorCode.SIN_REGLA_FINAL)
    if conjunto.fecha_vigencia is None:
        raise exceptions.ConjuntoInvalido(ErrorCode.FECHA_OBLIGATORIA)


def publicar(db: Session, conjunto_id: int, persona: Optional[Personal]) -> ConjuntoParametros:
    conjunto = leer_conjunto(db, conjunto_id)
    _editable(conjunto)
    validar_publicable(conjunto)
    ahora = datetime.now()
    anterior = db.scalar(select(ConjuntoParametros).where(ConjuntoParametros.estado == EstadoConjunto.VIGENTE))
    if anterior is not None:
        anterior.estado = EstadoConjunto.ARCHIVADO
        anterior.archivado_en = ahora
        db.flush()
    conjunto.estado = EstadoConjunto.VIGENTE
    conjunto.publicado_por_id = persona.id if persona else None
    conjunto.publicado_en = ahora
    db.commit()
    db.refresh(conjunto)
    return conjunto


def descartar(db: Session, conjunto_id: int) -> None:
    conjunto = leer_conjunto(db, conjunto_id)
    _editable(conjunto)
    db.delete(conjunto)
    db.commit()


def evaluar(conjunto: ConjuntoParametros, entrada: schemas.EntradaPrueba) -> schemas.ResultadoPrueba:
    hechos = set(entrada.hechos)
    aplicabilidad = evaluar_aplicabilidad(conjunto.reglas, hechos)
    sellos, leyendas, advertencias, detalle = [], [], [], []
    if aplicabilidad.resultado == ResultadoAplicabilidad.CORRESPONDE:
        resultado = evaluar_sellos(
            conjunto.umbrales,
            conjunto.advertencias,
            EntradaSellos(
                tipo=entrada.tipo,
                por_100=dict(entrada.por_100),
                energia_porcion=entrada.energia_porcion,
                hechos=hechos,
            ),
        )
        sellos, leyendas, advertencias = resultado.sellos, resultado.leyendas, resultado.advertencias
        detalle = [
            schemas.DetalleUmbral(**vars(d), simbolo=simbolo(d.comparacion)) for d in resultado.detalle
        ]
    return schemas.ResultadoPrueba(
        conjunto=schemas.ConjuntoReferencia.model_validate(conjunto),
        aplicabilidad=schemas.Aplicabilidad(
            resultado=aplicabilidad.resultado, mensaje=aplicabilidad.mensaje, regla_orden=aplicabilidad.regla_orden
        ),
        sellos=sellos,
        leyendas=leyendas,
        advertencias=advertencias,
        detalle=detalle,
    )
