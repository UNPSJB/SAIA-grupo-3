import re
from collections import defaultdict
from datetime import datetime
from typing import Any, Iterator

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from src.nutricion.informacion import obtener_informacion
from src.nutricion.models import ValorNutricionalInsumo
from src.personal.models import Personal
from src.receta import schemas as receta_schemas
from src.receta.services import obtener_composicion
from src.rotuladoFrontal.aplicabilidad import version_vigente
from src.rotuladoFrontal.dependencies import modulo_activo
from src.rotuladoFrontal.sellos import obtener_sellos
from src.rotulo import exceptions, schemas
from src.rotulo.constants import (
    ETIQUETAS_CAMPOS,
    ETIQUETAS_FUENTE,
    PALABRAS_NO_PERMITIDAS,
    REFERENCIA_NORMATIVA,
)
from src.rotulo.models import ExportacionRotulo
from src.rotulo.services import leer_borrador, leer_producto
from src.rotulo.vista_previa import obtener_vista_previa

PATRON = re.compile(PALABRAS_NO_PERMITIDAS, re.IGNORECASE)
NORMATIVA = re.compile(REFERENCIA_NORMATIVA, re.IGNORECASE)


def _textos(valor: Any, ruta: tuple[str, ...] = ()) -> Iterator[tuple[tuple[str, ...], str]]:
    if isinstance(valor, str):
        yield ruta, valor
    elif isinstance(valor, dict):
        for clave, contenido in valor.items():
            yield from _textos(contenido, ruta + (str(clave),))
    elif isinstance(valor, list):
        for contenido in valor:
            yield from _textos(contenido, ruta)


def menciones_no_permitidas(contenido: Any) -> list[tuple[str, str]]:
    encontradas = []
    for ruta, texto in _textos(contenido):
        limpio = NORMATIVA.sub(" ", texto)
        for coincidencia in PATRON.finditer(limpio):
            campo = next((ETIQUETAS_CAMPOS[r] for r in reversed(ruta) if r in ETIQUETAS_CAMPOS), ".".join(ruta))
            mencion = (coincidencia.group(0).lower(), campo)
            if mencion not in encontradas:
                encontradas.append(mencion)
    return encontradas


def controlar_texto(contenido: Any) -> None:
    encontradas = menciones_no_permitidas(contenido)
    if encontradas:
        detalle = ", ".join(f"«{palabra}» en {campo}" for palabra, campo in encontradas)
        raise exceptions.TextoNoPermitido(exceptions.TextoNoPermitido.DETAIL.format(menciones=detalle))


def _fuentes(db: Session, composicion: receta_schemas.Composicion) -> list[schemas.FuenteInsumo]:
    renglones = composicion.ingredientes.renglones + composicion.aditivos.renglones
    ids = [r.insumo.id for r in renglones]
    valores = defaultdict(list)
    for valor in db.scalars(select(ValorNutricionalInsumo).where(ValorNutricionalInsumo.insumo_id.in_(ids))):
        valores[valor.insumo_id].append(valor)
    resultado = []
    for renglon in renglones:
        propios = valores.get(renglon.insumo.id, [])
        fechas = [v.modificado_en or v.cargado_en for v in propios]
        resultado.append(
            schemas.FuenteInsumo(
                insumo_id=renglon.insumo.id,
                insumo=renglon.insumo.nombre,
                tipo=renglon.tipo.value,
                porcentaje=renglon.porcentaje,
                fuentes=sorted({ETIQUETAS_FUENTE.get(v.fuente.value, v.fuente.value) for v in propios}),
                detalles=sorted({v.detalle_fuente for v in propios if v.detalle_fuente}),
                alimentos_referencia=sorted(
                    {
                        f"{v.alimento_referencia.fuente} {v.alimento_referencia.codigo} · {v.alimento_referencia.nombre}"
                        for v in propios
                        if v.alimento_referencia is not None
                    }
                ),
                nutrientes_cargados=len(propios),
                actualizado_en=max(fechas) if fechas else None,
            )
        )
    return resultado


def armar_anexo(db: Session, producto_id: int) -> schemas.Anexo:
    producto = leer_producto(db, producto_id)
    version = version_vigente(db, producto_id)
    if version is None:
        raise exceptions.ExportacionSinReceta()
    composicion = obtener_composicion(db, version.id)
    informacion = obtener_informacion(db, version.id)
    frontal = obtener_sellos(db, producto_id) if modulo_activo() else None
    return schemas.Anexo(
        producto=producto,
        receta=receta_schemas.Version.model_validate(version),
        composicion=composicion,
        informacion_nutricional=informacion,
        fuentes=_fuentes(db, composicion),
        rotulado_frontal=frontal,
        conjunto_parametros_numero=frontal.calculo.conjunto.numero if frontal and frontal.calculo else None,
    )


def _resumen(exportacion: ExportacionRotulo) -> dict:
    return {
        "id": exportacion.id,
        "numero": exportacion.numero,
        "producto": exportacion.producto,
        "version_receta_numero": exportacion.version_receta_numero,
        "conjunto_parametros_numero": exportacion.conjunto_parametros_numero,
        "lista_para_revision": exportacion.lista_para_revision,
        "faltantes": exportacion.faltantes,
        "generado_por": exportacion.generado_por,
        "generado_en": exportacion.generado_en,
    }


def a_schema(exportacion: ExportacionRotulo) -> schemas.Exportacion:
    return schemas.Exportacion(**_resumen(exportacion), **exportacion.contenido)


def registrar_exportacion(db: Session, producto_id: int, persona: Personal) -> ExportacionRotulo:
    borrador = leer_borrador(db, producto_id)
    anexo = armar_anexo(db, producto_id)
    vista = obtener_vista_previa(db, producto_id)
    contenido = {
        "vista_previa": vista.model_dump(mode="json"),
        "anexo": anexo.model_dump(mode="json"),
    }
    controlar_texto(contenido)
    calculo = anexo.rotulado_frontal.calculo if anexo.rotulado_frontal else None
    numero = (
        db.scalar(select(func.max(ExportacionRotulo.numero)).where(ExportacionRotulo.producto_id == producto_id)) or 0
    ) + 1
    exportacion = ExportacionRotulo(
        producto_id=producto_id,
        borrador_id=borrador.id,
        numero=numero,
        version_receta_id=anexo.receta.id,
        version_receta_numero=anexo.receta.numero,
        conjunto_parametros_id=calculo.conjunto.id if calculo else None,
        conjunto_parametros_numero=calculo.conjunto.numero if calculo else None,
        calculo_sellos_id=calculo.id if calculo else None,
        lista_para_revision=vista.lista_para_revision,
        faltantes=len(vista.faltantes),
        contenido=contenido,
        generado_por_id=persona.id,
        generado_en=datetime.now(),
    )
    db.add(exportacion)
    db.flush()
    return exportacion


def exportar(db: Session, producto_id: int, persona: Personal) -> schemas.Exportacion:
    exportacion = registrar_exportacion(db, producto_id, persona)
    db.commit()
    db.refresh(exportacion)
    return a_schema(exportacion)


def listar_exportaciones(db: Session, producto_id: int) -> list[schemas.ExportacionResumen]:
    leer_producto(db, producto_id)
    exportaciones = db.scalars(
        select(ExportacionRotulo)
        .where(ExportacionRotulo.producto_id == producto_id)
        .order_by(ExportacionRotulo.id.desc())
    ).all()
    return [schemas.ExportacionResumen(**_resumen(e)) for e in exportaciones]


def leer_exportacion(db: Session, exportacion_id: int) -> schemas.Exportacion:
    exportacion = db.get(ExportacionRotulo, exportacion_id)
    if exportacion is None:
        raise exceptions.ExportacionNoEncontrada()
    return a_schema(exportacion)
