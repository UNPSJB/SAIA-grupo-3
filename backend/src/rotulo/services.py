from datetime import datetime
from typing import Optional

from sqlalchemy import select
from sqlalchemy.orm import Session

from src.loteProduccion.constants import EstadoLote
from src.loteProduccion.models import LoteProduccion
from src.nutricion.calculo import obtener_o_calcular
from src.personal.models import Personal
from src.producto.models import Producto
from src.receta.services import obtener_lista_ingredientes
from src.rotuladoFrontal.aplicabilidad import registro_aplicabilidad, version_vigente
from src.rotuladoFrontal.constants import ResultadoAplicabilidad
from src.rotuladoFrontal.dependencies import modulo_activo
from src.rotuladoFrontal.models import CalculoSellos
from src.rotulo import alergenos, exceptions, schemas
from src.rotulo.constants import (
    ETIQUETAS_AUTOMATICOS,
    LEYENDA_DURACION_INICIAL,
    PAIS_ORIGEN_INICIAL,
    CampoAutomatico,
    EstadoDeclaracion,
    Origen,
    Seccion,
)
from src.rotulo.models import BorradorRotulo, EdicionCampoRotulo
from src.unidadMedida.models import TipoUnidadMedida, UnidadMedida

CAMPOS_MANUALES = (
    "contenido_neto",
    "contenido_neto_unidad_id",
    "razon_social",
    "domicilio",
    "pais_origen",
    "tipo_registro",
    "numero_registro",
    "numero_establecimiento",
    "es_importado",
    "importador_razon_social",
    "importador_domicilio",
    "vida_util_cantidad",
    "vida_util_unidad",
    "requiere_instrucciones",
    "instrucciones",
    "conservacion_condicion",
    "conservacion_temp_min",
    "conservacion_temp_max",
    "conservacion_duracion_cantidad",
    "conservacion_duracion_unidad",
    "conservacion_abierto",
)


def leer_producto(db: Session, producto_id: int) -> Producto:
    producto = db.get(Producto, producto_id)
    if producto is None:
        raise exceptions.ProductoNoEncontrado()
    return producto


def leer_borrador(db: Session, producto_id: int) -> BorradorRotulo:
    leer_producto(db, producto_id)
    borrador = db.scalar(select(BorradorRotulo).where(BorradorRotulo.producto_id == producto_id))
    if borrador is None:
        raise exceptions.BorradorNoEncontrado()
    return borrador


def ultimo_lote(db: Session, producto_id: int) -> Optional[LoteProduccion]:
    return db.scalar(
        select(LoteProduccion)
        .where(
            LoteProduccion.producto_id == producto_id,
            LoteProduccion.activo.is_(True),
            LoteProduccion.estado != EstadoLote.ANULADO,
        )
        .order_by(LoteProduccion.fecha_produccion.desc(), LoteProduccion.id.desc())
        .limit(1)
    )


def datos_del_sistema(db: Session, producto: Producto) -> dict[CampoAutomatico, tuple[Optional[str], str]]:
    version = version_vigente(db, producto.id)
    if version is None:
        lista = (None, Origen.SIN_RECETA)
    else:
        resultado = obtener_lista_ingredientes(db, version.id)
        origen = Origen.RECETA if resultado.texto else Origen.RECETA_INCOMPLETA
        lista = (resultado.texto, origen.format(numero=version.numero))
    lote = ultimo_lote(db, producto.id)
    return {
        CampoAutomatico.DENOMINACION_VENTA: (producto.nombre, Origen.PRODUCTO),
        CampoAutomatico.LISTA_INGREDIENTES: lista,
        CampoAutomatico.IDENTIFICACION_LOTE: (
            (lote.codigo, Origen.LOTE.format(codigo=lote.codigo)) if lote else (None, Origen.SIN_LOTE)
        ),
    }


def meta_automatico(valor: Optional[str], origen: str, editado: bool = False, persona_id=None, fecha=None) -> dict:
    return {
        "valor_automatico": valor,
        "origen": origen,
        "editado": editado,
        "editado_por_id": persona_id,
        "editado_en": fecha.isoformat() if fecha else None,
    }


def refrescar_automaticos(borrador: BorradorRotulo, sistema: dict) -> bool:
    cambios = False
    automaticos = dict(borrador.automaticos or {})
    for campo, (valor, origen) in sistema.items():
        meta = automaticos.get(campo.value)
        if meta and meta.get("editado"):
            continue
        if meta is None or getattr(borrador, campo.value) != valor or meta.get("origen") != origen:
            setattr(borrador, campo.value, valor)
            automaticos[campo.value] = meta_automatico(valor, origen)
            cambios = True
    if cambios:
        borrador.automaticos = automaticos
    return cambios


def _informacion_nutricional(db: Session, producto_id: int) -> Optional[schemas.InformacionNutricionalResumen]:
    version = version_vigente(db, producto_id)
    if version is None:
        return None
    informacion = obtener_o_calcular(db, version)
    return schemas.InformacionNutricionalResumen(
        receta_id=version.receta_id,
        version_id=version.id,
        numero=version.numero,
        completa=informacion.completa,
        faltantes=len(informacion.faltantes),
        calculada_en=informacion.calculada_en,
    )


def _rotulado_frontal(db: Session, producto_id: int) -> Optional[schemas.RotuladoFrontalResumen]:
    if not modulo_activo():
        return None
    registro = registro_aplicabilidad(db, producto_id)
    resumen = schemas.RotuladoFrontalResumen(
        resultado=registro.resultado.value if registro and registro.resultado else None,
        mensaje=registro.mensaje if registro else None,
    )
    if registro is None or registro.resultado != ResultadoAplicabilidad.CORRESPONDE:
        return resumen
    calculo = db.scalar(
        select(CalculoSellos).where(CalculoSellos.producto_id == producto_id).order_by(CalculoSellos.id.desc()).limit(1)
    )
    if calculo is not None:
        resumen.calculo_id = calculo.id
        resumen.leyendas = calculo.leyendas
        resumen.advertencias = calculo.advertencias
        resumen.provisorio = calculo.provisorio
        resumen.conjunto_numero = calculo.conjunto.numero
        resumen.conjunto_fecha_vigencia = calculo.conjunto.fecha_vigencia
        resumen.calculado_en = calculo.calculado_en
    return resumen


def completitud(
    borrador: BorradorRotulo,
    informacion: Optional[schemas.InformacionNutricionalResumen],
    frontal: Optional[schemas.RotuladoFrontalResumen],
) -> schemas.Completitud:
    requisitos = [
        ("denominacion_venta", "Denominación de venta", Seccion.DENOMINACION, bool(borrador.denominacion_venta)),
        ("lista_ingredientes", "Lista de ingredientes", Seccion.INGREDIENTES, bool(borrador.lista_ingredientes)),
        (
            "contenido_neto",
            "Contenido neto y su unidad",
            Seccion.CONTENIDO,
            borrador.contenido_neto is not None and borrador.contenido_neto_unidad_id is not None,
        ),
        ("razon_social", "Razón social", Seccion.ORIGEN, bool(borrador.razon_social)),
        ("domicilio", "Domicilio", Seccion.ORIGEN, bool(borrador.domicilio)),
        ("pais_origen", "País de origen", Seccion.ORIGEN, bool(borrador.pais_origen)),
        (
            "numero_registro",
            "Número de RNPA/RPPA",
            Seccion.ORIGEN,
            bool(borrador.tipo_registro and borrador.numero_registro),
        ),
    ]
    if borrador.es_importado:
        requisitos += [
            ("importador_razon_social", "Razón social del importador", Seccion.ORIGEN, bool(borrador.importador_razon_social)),
            ("importador_domicilio", "Domicilio del importador", Seccion.ORIGEN, bool(borrador.importador_domicilio)),
        ]
    requisitos += [
        ("identificacion_lote", "Identificación del lote", Seccion.LOTE, bool(borrador.identificacion_lote)),
        ("vida_util_cantidad", "Fecha de duración (vida útil)", Seccion.DURACION, bool(borrador.vida_util_cantidad)),
    ]
    if borrador.requiere_instrucciones:
        requisitos.append(
            ("instrucciones", "Preparación e instrucciones de uso", Seccion.INSTRUCCIONES, bool(borrador.instrucciones))
        )
    requisitos.append(
        (
            "informacion_nutricional",
            "Información nutricional completa",
            Seccion.NUTRICIONAL,
            bool(informacion and informacion.completa),
        )
    )
    if frontal is not None:
        listo = frontal.resultado is not None and (
            frontal.resultado != ResultadoAplicabilidad.CORRESPONDE
            or (frontal.calculo_id is not None and not frontal.provisorio)
        )
        requisitos.append(("rotulado_frontal", "Rotulado frontal evaluado y sellos calculados", Seccion.FRONTAL, listo))
    requisitos += [
        (
            "alergenos",
            "Declaración de alérgenos confirmada",
            Seccion.ALERGENOS,
            borrador.alergenos_estado == EstadoDeclaracion.CONFIRMADA,
        ),
        (
            "conservacion_condicion",
            "Condiciones de conservación",
            Seccion.ALERGENOS,
            borrador.conservacion_condicion is not None,
        ),
    ]
    faltantes = [
        schemas.Faltante(campo=campo, etiqueta=etiqueta, seccion=seccion)
        for campo, etiqueta, seccion, cumple in requisitos
        if not cumple
    ]
    total = len(requisitos)
    completos = total - len(faltantes)
    return schemas.Completitud(
        porcentaje=round(completos * 100 / total), completos=completos, total=total, faltantes=faltantes
    )


def _a_schema(
    db: Session, borrador: BorradorRotulo, sistema: dict, propuesta: alergenos.Propuesta
) -> schemas.Borrador:
    informacion = _informacion_nutricional(db, borrador.producto_id)
    frontal = _rotulado_frontal(db, borrador.producto_id)
    personas = {}
    automaticos = []
    for campo in CampoAutomatico:
        meta = borrador.automaticos.get(campo.value, {})
        valor_sistema, origen = sistema[campo]
        editado = bool(meta.get("editado"))
        persona_id = meta.get("editado_por_id")
        if persona_id and persona_id not in personas:
            personas[persona_id] = db.get(Personal, persona_id)
        automaticos.append(
            schemas.CampoAutomaticoEstado(
                campo=campo,
                etiqueta=ETIQUETAS_AUTOMATICOS[campo],
                valor=getattr(borrador, campo.value),
                valor_sistema=valor_sistema,
                origen=origen if not editado else meta.get("origen", origen),
                editado=editado,
                editado_por=personas.get(persona_id),
                editado_en=meta.get("editado_en"),
                cambio_en_sistema=editado and meta.get("valor_automatico") != valor_sistema,
            )
        )
    return schemas.Borrador(
        id=borrador.id,
        producto=borrador.producto,
        denominacion_venta=borrador.denominacion_venta,
        lista_ingredientes=borrador.lista_ingredientes,
        identificacion_lote=borrador.identificacion_lote,
        contenido_neto=borrador.contenido_neto,
        contenido_neto_unidad=borrador.contenido_neto_unidad,
        razon_social=borrador.razon_social,
        domicilio=borrador.domicilio,
        pais_origen=borrador.pais_origen,
        tipo_registro=borrador.tipo_registro,
        numero_registro=borrador.numero_registro,
        numero_establecimiento=borrador.numero_establecimiento,
        es_importado=borrador.es_importado,
        importador_razon_social=borrador.importador_razon_social,
        importador_domicilio=borrador.importador_domicilio,
        vida_util_cantidad=borrador.vida_util_cantidad,
        vida_util_unidad=borrador.vida_util_unidad,
        leyenda_duracion=borrador.leyenda_duracion,
        requiere_instrucciones=borrador.requiere_instrucciones,
        instrucciones=borrador.instrucciones,
        conservacion_condicion=borrador.conservacion_condicion,
        conservacion_temp_min=borrador.conservacion_temp_min,
        conservacion_temp_max=borrador.conservacion_temp_max,
        conservacion_duracion_cantidad=borrador.conservacion_duracion_cantidad,
        conservacion_duracion_unidad=borrador.conservacion_duracion_unidad,
        conservacion_abierto=borrador.conservacion_abierto,
        leyenda_conservacion=alergenos.leyenda_conservacion(borrador),
        alergenos=alergenos.declaracion(db, borrador, propuesta),
        automaticos=automaticos,
        informacion_nutricional=informacion,
        rotulado_frontal=frontal,
        completitud=completitud(borrador, informacion, frontal),
        ediciones=[
            schemas.Edicion(
                id=e.id,
                campo=e.campo,
                etiqueta=ETIQUETAS_AUTOMATICOS[e.campo],
                origen=e.origen,
                valor_sistema=e.valor_sistema,
                valor_original=e.valor_original,
                valor_nuevo=e.valor_nuevo,
                personal=e.personal,
                fecha_hora=e.fecha_hora,
            )
            for e in borrador.ediciones
        ],
        creado_por=borrador.creado_por,
        creado_en=borrador.creado_en,
        actualizado_por=borrador.actualizado_por,
        actualizado_en=borrador.actualizado_en,
    )


def obtener_borrador(db: Session, producto_id: int) -> schemas.Borrador:
    borrador = leer_borrador(db, producto_id)
    sistema = datos_del_sistema(db, borrador.producto)
    refrescar_automaticos(borrador, sistema)
    propuesta = alergenos.armar_propuesta(db, producto_id)
    alergenos.revisar_declaracion(borrador, propuesta)
    db.commit()
    db.refresh(borrador)
    return _a_schema(db, borrador, sistema, propuesta)


def crear_borrador(db: Session, producto_id: int, persona: Personal) -> schemas.Borrador:
    producto = leer_producto(db, producto_id)
    if db.scalar(select(BorradorRotulo.id).where(BorradorRotulo.producto_id == producto_id)):
        raise exceptions.BorradorExistente()
    ahora = datetime.now()
    borrador = BorradorRotulo(
        producto_id=producto.id,
        pais_origen=PAIS_ORIGEN_INICIAL,
        leyenda_duracion=LEYENDA_DURACION_INICIAL,
        automaticos={},
        puede_contener_ids=[],
        alergenos_estado=EstadoDeclaracion.SUGERIDA,
        creado_por_id=persona.id,
        creado_en=ahora,
        actualizado_por_id=persona.id,
        actualizado_en=ahora,
    )
    refrescar_automaticos(borrador, datos_del_sistema(db, producto))
    db.add(borrador)
    db.commit()
    return obtener_borrador(db, producto_id)


def _validar_unidad(db: Session, unidad_id: Optional[int]) -> None:
    if unidad_id is None:
        return
    unidad = db.get(UnidadMedida, unidad_id)
    if unidad is None:
        raise exceptions.UnidadNoEncontrada()
    if unidad.tipo not in (TipoUnidadMedida.PESO, TipoUnidadMedida.CAPACIDAD):
        raise exceptions.UnidadContenidoInvalida()


def actualizar_borrador(
    db: Session, producto_id: int, datos: schemas.BorradorDatos, persona: Personal
) -> schemas.Borrador:
    borrador = leer_borrador(db, producto_id)
    _validar_unidad(db, datos.contenido_neto_unidad_id)
    sistema = datos_del_sistema(db, borrador.producto)
    refrescar_automaticos(borrador, sistema)
    ahora = datetime.now()
    automaticos = dict(borrador.automaticos)
    for campo in CampoAutomatico:
        nuevo = getattr(datos, campo.value)
        actual = getattr(borrador, campo.value)
        if nuevo == actual:
            continue
        valor_sistema, origen = sistema[campo]
        borrador.ediciones.append(
            EdicionCampoRotulo(
                campo=campo,
                origen=origen,
                valor_sistema=valor_sistema,
                valor_original=actual,
                valor_nuevo=nuevo,
                personal_id=persona.id,
                fecha_hora=ahora,
            )
        )
        setattr(borrador, campo.value, nuevo)
        editado = nuevo != valor_sistema
        automaticos[campo.value] = meta_automatico(valor_sistema, origen, editado, persona.id if editado else None, ahora if editado else None)
    borrador.automaticos = automaticos
    for campo in CAMPOS_MANUALES:
        setattr(borrador, campo, getattr(datos, campo))
    propuesta = alergenos.armar_propuesta(db, producto_id)
    alergenos.revisar_declaracion(borrador, propuesta)
    alergenos.actualizar_puede_contener(db, borrador, datos.puede_contener_ids, propuesta)
    if not datos.es_importado:
        borrador.importador_razon_social = None
        borrador.importador_domicilio = None
    if not datos.requiere_instrucciones:
        borrador.instrucciones = None
    borrador.leyenda_duracion = datos.leyenda_duracion or LEYENDA_DURACION_INICIAL
    borrador.actualizado_por_id = persona.id
    borrador.actualizado_en = ahora
    db.commit()
    return obtener_borrador(db, producto_id)


def listar_rotulos(db: Session) -> list[schemas.RotuloListado]:
    productos = db.scalars(select(Producto).order_by(Producto.nombre)).all()
    borradores = {b.producto_id: b for b in db.scalars(select(BorradorRotulo)).all()}
    resultado = []
    for producto in productos:
        borrador = borradores.get(producto.id)
        if borrador is None:
            if producto.activo:
                resultado.append(schemas.RotuloListado(producto=producto))
            continue
        alergenos.revisar_declaracion(borrador, alergenos.armar_propuesta(db, producto.id))
        estado = completitud(
            borrador, _informacion_nutricional(db, producto.id), _rotulado_frontal(db, producto.id)
        )
        resultado.append(
            schemas.RotuloListado(
                producto=producto,
                borrador_id=borrador.id,
                porcentaje=estado.porcentaje,
                faltantes=len(estado.faltantes),
                actualizado_en=borrador.actualizado_en,
            )
        )
    db.commit()
    return resultado


def confirmar_alergenos(db: Session, producto_id: int, persona: Personal) -> schemas.Borrador:
    borrador = leer_borrador(db, producto_id)
    alergenos.confirmar(db, borrador, persona)
    borrador.actualizado_por_id = persona.id
    borrador.actualizado_en = datetime.now()
    db.commit()
    return obtener_borrador(db, producto_id)
