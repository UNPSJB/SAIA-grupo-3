from datetime import datetime
from typing import Optional

from sqlalchemy import select
from sqlalchemy.orm import Session

from src.insumos.constants import TipoInsumo
from src.personal.models import Personal
from src.producto.models import Producto
from src.receta.models import Receta, RenglonReceta, VersionReceta
from src.rotuladoFrontal import exceptions, schemas
from src.rotuladoFrontal.constants import ETIQUETAS_HECHO, HECHOS_DE_RECETA, Aviso, Hecho
from src.rotuladoFrontal.models import AplicabilidadProducto, CorreccionAgregado
from src.rotuladoFrontal.motor import evaluar_aplicabilidad
from src.rotuladoFrontal.services import conjunto_vigente

MARCAS_INSUMO = {
    Hecho.AGREGA_AZUCARES: "es_azucar_anadido",
    Hecho.AGREGA_GRASAS: "es_grasa_anadida",
    Hecho.AGREGA_SODIO: "aporta_sodio_anadido",
    Hecho.CONTIENE_CAFEINA: "contiene_cafeina",
}


def _leer_producto(db: Session, producto_id: int) -> Producto:
    producto = db.get(Producto, producto_id)
    if producto is None:
        raise exceptions.ProductoNoEncontrado()
    return producto


def version_vigente(db: Session, producto_id: int) -> Optional[VersionReceta]:
    receta = db.scalar(select(Receta).where(Receta.producto_id == producto_id))
    return receta.version_vigente if receta is not None else None


def _es_edulcorante(renglon: RenglonReceta) -> bool:
    if renglon.tipo != TipoInsumo.ADITIVO:
        return False
    referencia = renglon.aditivo_referencia or renglon.insumo.aditivo_referencia
    return bool(referencia and referencia.clase_funcional and referencia.clase_funcional.es_edulcorante)


def _provoca(renglon: RenglonReceta, hecho: Hecho) -> bool:
    if hecho == Hecho.CONTIENE_EDULCORANTES:
        return _es_edulcorante(renglon)
    return bool(getattr(renglon.insumo, MARCAS_INSUMO[hecho]))


def proponer_agregados(version: Optional[VersionReceta]) -> dict[Hecho, list[schemas.InsumoCausa]]:
    causas: dict[Hecho, list[schemas.InsumoCausa]] = {hecho: [] for hecho in HECHOS_DE_RECETA}
    if version is None:
        return causas
    for renglon in version.renglones:
        for hecho in HECHOS_DE_RECETA:
            if _provoca(renglon, hecho):
                causas[hecho].append(
                    schemas.InsumoCausa(id=renglon.insumo_id, nombre=renglon.insumo.nombre, tipo=renglon.tipo.value)
                )
    return causas


def _registro(db: Session, producto_id: int) -> Optional[AplicabilidadProducto]:
    return db.scalar(select(AplicabilidadProducto).where(AplicabilidadProducto.producto_id == producto_id))


def _receta(version: Optional[VersionReceta]) -> Optional[schemas.RecetaEvaluada]:
    if version is None:
        return None
    return schemas.RecetaEvaluada(receta_id=version.receta_id, version_id=version.id, numero=version.numero)


def _avisos(db: Session, registro, version, sugeridos: dict[str, bool]) -> list[str]:
    avisos = []
    if version is None:
        avisos.append(Aviso.SIN_RECETA)
    if registro is None or registro.resultado is None:
        return avisos
    vigente = conjunto_vigente(db)
    if registro.conjunto_id != vigente.id:
        avisos.append(Aviso.PARAMETROS_NUEVOS.format(numero=vigente.numero))
    if version is not None and registro.version_receta_id != version.id:
        avisos.append(Aviso.RECETA_NUEVA.format(numero=version.numero))
    elif registro.sugeridos != sugeridos:
        avisos.append(Aviso.SUGERENCIAS_CAMBIARON)
    return avisos


def obtener_aplicabilidad(db: Session, producto_id: int) -> schemas.AplicabilidadProducto:
    producto = _leer_producto(db, producto_id)
    version = version_vigente(db, producto_id)
    causas = proponer_agregados(version)
    sugeridos = {hecho.value: bool(causas[hecho]) for hecho in HECHOS_DE_RECETA}
    registro = _registro(db, producto_id)
    correcciones = registro.correcciones if registro else {}
    agregados = [
        schemas.AgregadoProducto(
            hecho=hecho,
            etiqueta=ETIQUETAS_HECHO[hecho],
            sugerido=sugeridos[hecho.value],
            causas=causas[hecho],
            corregido=correcciones.get(hecho.value),
            valor=correcciones.get(hecho.value, sugeridos[hecho.value]),
        )
        for hecho in HECHOS_DE_RECETA
    ]
    evaluacion = None
    if registro is not None and registro.resultado is not None:
        evaluacion = schemas.Evaluacion(
            resultado=registro.resultado,
            mensaje=registro.mensaje,
            regla_orden=registro.regla_orden,
            conjunto=schemas.ConjuntoReferencia.model_validate(registro.conjunto),
            version_receta=_receta(registro.version_receta),
            hechos=[Hecho(h) for h in registro.hechos],
            evaluado_por=registro.evaluado_por,
            evaluado_en=registro.evaluado_en,
        )
    historial = db.scalars(
        select(CorreccionAgregado)
        .where(CorreccionAgregado.producto_id == producto_id)
        .order_by(CorreccionAgregado.fecha_hora.desc(), CorreccionAgregado.id.desc())
    ).all()
    return schemas.AplicabilidadProducto(
        producto=producto,
        receta=_receta(version),
        envasado_ausencia_cliente=registro.envasado_ausencia_cliente if registro else None,
        tipo_producto=registro.tipo_producto if registro else schemas.TipoProducto.SOLIDO,
        agregados=agregados,
        evaluacion=evaluacion,
        avisos=_avisos(db, registro, version, sugeridos),
        historial=[
            schemas.MovimientoCorreccion(
                id=m.id,
                hecho=m.hecho,
                etiqueta=ETIQUETAS_HECHO[m.hecho],
                valor_sugerido=m.valor_sugerido,
                valor_anterior=m.valor_anterior,
                valor_nuevo=m.valor_nuevo,
                motivo=m.motivo,
                personal=m.personal,
                fecha_hora=m.fecha_hora,
            )
            for m in historial
        ],
    )


def evaluar_producto(
    db: Session, producto_id: int, datos: schemas.AplicabilidadDatos, persona: Personal
) -> AplicabilidadProducto:
    _leer_producto(db, producto_id)
    conjunto = conjunto_vigente(db)
    version = version_vigente(db, producto_id)
    causas = proponer_agregados(version)
    sugeridos = {hecho.value: bool(causas[hecho]) for hecho in HECHOS_DE_RECETA}
    registro = _registro(db, producto_id)
    if registro is None:
        registro = AplicabilidadProducto(producto_id=producto_id, correcciones={}, sugeridos={}, hechos=[])
        db.add(registro)
    ahora = datetime.now()
    correcciones = dict(registro.correcciones or {})
    for correccion in datos.correcciones:
        clave = correccion.hecho.value
        nuevo = correccion.valor if correccion.valor != sugeridos[clave] else None
        anterior = correcciones.get(clave)
        if nuevo == anterior:
            continue
        if nuevo is None:
            correcciones.pop(clave, None)
        else:
            correcciones[clave] = nuevo
        db.add(
            CorreccionAgregado(
                producto_id=producto_id,
                hecho=correccion.hecho,
                valor_sugerido=sugeridos[clave],
                valor_anterior=anterior,
                valor_nuevo=nuevo,
                motivo=correccion.motivo,
                personal_id=persona.id,
                fecha_hora=ahora,
            )
        )
    hechos = {Hecho.ENVASADO_AUSENCIA_CLIENTE} if datos.envasado_ausencia_cliente else set()
    hechos |= {hecho for hecho in HECHOS_DE_RECETA if correcciones.get(hecho.value, sugeridos[hecho.value])}
    resultado = evaluar_aplicabilidad(conjunto.reglas, hechos)
    registro.envasado_ausencia_cliente = datos.envasado_ausencia_cliente
    registro.tipo_producto = datos.tipo_producto
    registro.correcciones = correcciones
    registro.sugeridos = sugeridos
    registro.hechos = [hecho.value for hecho in Hecho if hecho in hechos]
    registro.version_receta_id = version.id if version else None
    registro.resultado = resultado.resultado
    registro.mensaje = resultado.mensaje
    registro.regla_orden = resultado.regla_orden
    registro.conjunto_id = conjunto.id
    registro.evaluado_por_id = persona.id
    registro.evaluado_en = ahora
    db.flush()
    return registro


def guardar_aplicabilidad(
    db: Session, producto_id: int, datos: schemas.AplicabilidadDatos, persona: Personal
) -> schemas.AplicabilidadProducto:
    evaluar_producto(db, producto_id, datos, persona)
    db.commit()
    return obtener_aplicabilidad(db, producto_id)
