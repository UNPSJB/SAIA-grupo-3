import calendar
from datetime import date, datetime, timedelta
from typing import Optional

from sqlalchemy.orm import Session

from src.nutricion.informacion import obtener_informacion
from src.personal.models import Personal
from src.rotuladoFrontal.aplicabilidad import version_vigente
from src.rotulo import schemas
from src.rotulo.constants import LEYENDA_BORRADOR, AdvertenciaVistaPrevia, UnidadVidaUtil
from src.rotulo.services import obtener_borrador, ultimo_lote


def sumar_meses(fecha: date, meses: int) -> date:
    total = fecha.month - 1 + meses
    anio, mes = fecha.year + total // 12, total % 12 + 1
    return date(anio, mes, min(fecha.day, calendar.monthrange(anio, mes)[1]))


def fecha_de_duracion(inicio: date, cantidad: int, unidad: UnidadVidaUtil) -> date:
    if unidad == UnidadVidaUtil.MESES:
        return sumar_meses(inicio, cantidad)
    return inicio + timedelta(days=cantidad)


def texto_contenido(borrador: schemas.Borrador) -> Optional[str]:
    if borrador.contenido_neto is None or borrador.contenido_neto_unidad is None:
        return None
    cantidad = f"{borrador.contenido_neto:g}".replace(".", ",")
    return f"{cantidad} {borrador.contenido_neto_unidad.sufijo}"


def armar_fecha_duracion(db: Session, borrador: schemas.Borrador) -> schemas.FechaDuracionVistaPrevia:
    resultado = schemas.FechaDuracionVistaPrevia(leyenda=borrador.leyenda_duracion)
    lote = ultimo_lote(db, borrador.producto.id)
    if lote is None:
        return resultado
    resultado.lote_codigo = lote.codigo
    resultado.lote_fecha_produccion = lote.fecha_produccion
    if borrador.vida_util_cantidad:
        resultado.fecha = fecha_de_duracion(lote.fecha_produccion, borrador.vida_util_cantidad, borrador.vida_util_unidad)
    return resultado


def obtener_vista_previa(
    db: Session, producto_id: int, persona: Optional[Personal] = None
) -> schemas.VistaPrevia:
    borrador = obtener_borrador(db, producto_id)
    version = version_vigente(db, producto_id)
    informacion = obtener_informacion(db, version.id) if version is not None else None
    tabla_incompleta = informacion is None or not informacion.completa
    advertencias = []
    faltantes = [
        schemas.FaltanteVistaPrevia(campo=f.campo, etiqueta=f.etiqueta, seccion=f.seccion)
        for f in borrador.completitud.faltantes
    ]
    if faltantes:
        advertencias.append(
            AdvertenciaVistaPrevia.FALTANTE_UNO
            if len(faltantes) == 1
            else AdvertenciaVistaPrevia.FALTANTES.format(cantidad=len(faltantes))
        )
    if informacion is None:
        advertencias.append(AdvertenciaVistaPrevia.SIN_TABLA)
    elif not informacion.completa:
        advertencias.append(
            AdvertenciaVistaPrevia.TABLA_INCOMPLETA.format(
                cantidad=len(informacion.faltantes), numero=informacion.numero
            )
        )
    frontal = borrador.rotulado_frontal
    if frontal is not None and frontal.provisorio:
        advertencias.append(AdvertenciaVistaPrevia.SELLOS_PROVISORIOS)
    return schemas.VistaPrevia(
        leyenda_borrador=LEYENDA_BORRADOR,
        generada_en=datetime.now(),
        generado_por=persona,
        borrador=borrador,
        contenido_neto_texto=texto_contenido(borrador),
        fecha_duracion=armar_fecha_duracion(db, borrador),
        informacion_nutricional=informacion,
        tabla_incompleta=tabla_incompleta,
        faltantes=faltantes,
        advertencias=advertencias,
        lista_para_revision=not faltantes and not tabla_incompleta,
    )