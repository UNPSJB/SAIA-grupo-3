from typing import Optional

from src.aditivoReferencia.models import AditivoReferencia
from src.configuracionProduccion.constants import FormatoAditivos
from src.insumos.constants import TipoInsumo
from src.receta import schemas
from src.receta.constants import DECIMALES_PORCENTAJE
from src.receta.models import RenglonReceta, VersionReceta

EPSILON = 1e-9


def denominacion(renglon: RenglonReceta) -> str:
    return renglon.insumo.denominacion_rotulo or renglon.insumo.nombre


def funcion(aditivo: AditivoReferencia) -> str:
    nombre = aditivo.clase_funcional.nombre
    return nombre[:1].lower() + nombre[1:]


def declarar_aditivo(aditivo: AditivoReferencia, formato: FormatoAditivos) -> str:
    if not aditivo.ins or formato == FormatoAditivos.FUNCION_NOMBRE:
        return aditivo.nombre
    if formato == FormatoAditivos.FUNCION_INS:
        return f"INS {aditivo.ins}"
    return f"{aditivo.nombre} (INS {aditivo.ins})"


def _porcentaje(renglon: RenglonReceta) -> Optional[float]:
    return round(renglon.porcentaje, DECIMALES_PORCENTAJE) if renglon.porcentaje is not None else None


def ordenar_ingredientes(version: VersionReceta) -> list[RenglonReceta]:
    ingredientes = [r for r in version.renglones if r.tipo == TipoInsumo.INGREDIENTE]
    if version.orden_rotulo_manual and all(r.orden_rotulo is not None for r in ingredientes):
        return sorted(ingredientes, key=lambda r: (r.orden_rotulo, r.orden))
    return sorted(ingredientes, key=lambda r: (-(r.porcentaje or 0), r.orden))


def agrupar_aditivos(version: VersionReceta) -> list[list[RenglonReceta]]:
    grupos: dict[int, list[RenglonReceta]] = {}
    for renglon in version.renglones:
        if renglon.tipo == TipoInsumo.ADITIVO and renglon.aditivo_referencia is not None:
            grupos.setdefault(renglon.aditivo_referencia.clase_funcional_id, []).append(renglon)
    ordenados = [sorted(grupo, key=lambda r: (-(r.porcentaje or 0), r.orden)) for grupo in grupos.values()]
    return sorted(ordenados, key=lambda grupo: (-(grupo[0].porcentaje or 0), min(r.orden for r in grupo)))


def armar_lista(version: VersionReceta, formato: FormatoAditivos) -> schemas.ListaIngredientes:
    ingredientes = ordenar_ingredientes(version)
    filas = []
    anterior: Optional[float] = None
    for posicion, renglon in enumerate(ingredientes, start=1):
        actual = renglon.porcentaje
        fuera_de_orden = anterior is not None and actual is not None and actual > anterior + EPSILON
        filas.append(
            schemas.IngredienteLista(
                renglon_id=renglon.id,
                insumo=renglon.insumo,
                denominacion=denominacion(renglon),
                porcentaje=_porcentaje(renglon),
                posicion=posicion,
                fuera_de_orden=fuera_de_orden,
            )
        )
        anterior = actual
    grupos = []
    for grupo in agrupar_aditivos(version):
        referencia = grupo[0].aditivo_referencia
        clase = referencia.clase_funcional
        solo_funcion = clase.declarar_solo_funcion
        declaraciones = [declarar_aditivo(r.aditivo_referencia, formato) for r in grupo]
        grupos.append(
            schemas.GrupoAditivosLista(
                clase_funcional=clase,
                solo_funcion=solo_funcion,
                declaracion=funcion(referencia) if solo_funcion else f"{funcion(referencia)}: {', '.join(declaraciones)}",
                aditivos=[
                    schemas.AditivoLista(
                        renglon_id=r.id,
                        insumo=r.insumo,
                        nombre=r.aditivo_referencia.nombre,
                        ins=r.aditivo_referencia.ins,
                        porcentaje=_porcentaje(r),
                    )
                    for r in grupo
                ],
            )
        )
    porcentajes = [fila.porcentaje for fila in filas if fila.porcentaje is not None]
    completa = version.composicion_completa
    texto = None
    if completa:
        partes = [fila.denominacion for fila in filas] + [grupo.declaracion for grupo in grupos]
        texto = f"Ingredientes: {', '.join(partes)}."
    return schemas.ListaIngredientes(
        version_id=version.id,
        receta_id=version.receta_id,
        version_numero=version.numero,
        estado=version.estado,
        completa=completa,
        manual=version.orden_rotulo_manual,
        ajustado_por=version.orden_rotulo_ajustado_por,
        ajustado_en=version.orden_rotulo_ajustado_en,
        aviso_orden_anterior=version.orden_rotulo_aviso,
        hay_empates=len(porcentajes) != len(set(porcentajes)),
        formato=formato,
        ingredientes=filas,
        grupos_aditivos=grupos,
        texto=texto,
    )


def heredar_orden_manual(anterior: VersionReceta, nueva: VersionReceta) -> None:
    if not anterior.orden_rotulo_manual:
        return

    def porcentajes(version: VersionReceta) -> dict[int, Optional[float]]:
        return {r.insumo_id: _porcentaje(r) for r in version.renglones if r.tipo == TipoInsumo.INGREDIENTE}

    if not (anterior.composicion_completa and nueva.composicion_completa and porcentajes(anterior) == porcentajes(nueva)):
        nueva.orden_rotulo_aviso = True
        return
    posiciones = {r.insumo_id: r.orden_rotulo for r in anterior.renglones if r.tipo == TipoInsumo.INGREDIENTE}
    for renglon in nueva.renglones:
        if renglon.tipo == TipoInsumo.INGREDIENTE:
            renglon.orden_rotulo = posiciones[renglon.insumo_id]
    nueva.orden_rotulo_manual = True
    nueva.orden_rotulo_ajustado_por_id = anterior.orden_rotulo_ajustado_por_id
    nueva.orden_rotulo_ajustado_en = anterior.orden_rotulo_ajustado_en
