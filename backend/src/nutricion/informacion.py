from datetime import datetime
from decimal import ROUND_HALF_UP, Decimal
from typing import Optional

from sqlalchemy import select
from sqlalchemy.orm import Session

from src.nutricion import exceptions, schemas
from src.nutricion.calculo import obtener_o_calcular
from src.nutricion.constants import (
    DECIMALES_VD_INICIAL,
    EXPRESION_NO_SIGNIFICATIVO_INICIAL,
    FACTOR_KJ_POR_KCAL,
    LEYENDA_VD_INICIAL,
    NUTRIENTES,
    REGLAS_INICIALES,
    VALORES_DIARIOS_INICIALES,
    Nutriente,
    TipoFaltante,
)
from src.nutricion.models import ConfiguracionNutricional, ReglaExpresionNutriente, ValorDiarioReferencia
from src.personal.models import Personal
from src.receta.models import VersionReceta

ID_CONFIGURACION = 1


def asegurar_configuracion(db: Session) -> bool:
    creado = False
    if db.get(ConfiguracionNutricional, ID_CONFIGURACION) is None:
        db.add(
            ConfiguracionNutricional(
                id=ID_CONFIGURACION,
                expresion_no_significativo=EXPRESION_NO_SIGNIFICATIVO_INICIAL,
                decimales_vd=DECIMALES_VD_INICIAL,
                leyenda_vd=LEYENDA_VD_INICIAL,
            )
        )
        creado = True
    existentes_vd = set(db.scalars(select(ValorDiarioReferencia.nutriente)).all())
    existentes_reglas = set(db.scalars(select(ReglaExpresionNutriente.nutriente)).all())
    for nutriente in NUTRIENTES:
        if nutriente not in existentes_vd:
            db.add(ValorDiarioReferencia(nutriente=nutriente, valor=VALORES_DIARIOS_INICIALES[nutriente]))
            creado = True
        if nutriente not in existentes_reglas:
            decimales, entero_desde, umbral = REGLAS_INICIALES[nutriente]
            db.add(
                ReglaExpresionNutriente(
                    nutriente=nutriente,
                    unidad=NUTRIENTES[nutriente][1],
                    decimales=decimales,
                    entero_desde=entero_desde,
                    umbral_no_significativo=umbral,
                )
            )
            creado = True
    if creado:
        db.flush()
    return creado


def _cargar(db: Session):
    if asegurar_configuracion(db):
        db.commit()
    configuracion = db.get(ConfiguracionNutricional, ID_CONFIGURACION)
    valores_diarios = {fila.nutriente: fila for fila in db.scalars(select(ValorDiarioReferencia)).all()}
    reglas = {fila.nutriente: fila for fila in db.scalars(select(ReglaExpresionNutriente)).all()}
    return configuracion, valores_diarios, reglas


def obtener_configuracion(db: Session) -> schemas.ConfiguracionNutricional:
    configuracion, valores_diarios, reglas = _cargar(db)
    nutrientes = [
        schemas.NutrienteConfigurado(
            nutriente=nutriente,
            etiqueta=etiqueta,
            unidad_dato=unidad,
            valor_diario=valores_diarios[nutriente].valor,
            unidad=reglas[nutriente].unidad,
            decimales=reglas[nutriente].decimales,
            entero_desde=reglas[nutriente].entero_desde,
            umbral_no_significativo=reglas[nutriente].umbral_no_significativo,
        )
        for nutriente, (etiqueta, unidad, _) in NUTRIENTES.items()
    ]
    return schemas.ConfiguracionNutricional(
        expresion_no_significativo=configuracion.expresion_no_significativo,
        decimales_vd=configuracion.decimales_vd,
        leyenda_vd=configuracion.leyenda_vd,
        nutrientes=nutrientes,
        modificado_por=configuracion.modificado_por,
        modificado_en=configuracion.modificado_en,
    )


def guardar_configuracion(
    db: Session, datos: schemas.ConfiguracionNutricionalDatos, persona: Personal
) -> schemas.ConfiguracionNutricional:
    recibidos = [fila.nutriente for fila in datos.nutrientes]
    if len(recibidos) != len(set(recibidos)):
        raise exceptions.ReglaDuplicada()
    faltan = [NUTRIENTES[n][0] for n in NUTRIENTES if n not in recibidos]
    if faltan:
        raise exceptions.ReglasIncompletas(", ".join(faltan))
    configuracion, valores_diarios, reglas = _cargar(db)
    configuracion.expresion_no_significativo = datos.expresion_no_significativo
    configuracion.decimales_vd = datos.decimales_vd
    configuracion.leyenda_vd = datos.leyenda_vd
    configuracion.modificado_por_id = persona.id
    configuracion.modificado_en = datetime.now()
    for fila in datos.nutrientes:
        valores_diarios[fila.nutriente].valor = fila.valor_diario
        regla = reglas[fila.nutriente]
        regla.unidad = fila.unidad
        regla.decimales = fila.decimales
        regla.entero_desde = fila.entero_desde
        regla.umbral_no_significativo = fila.umbral_no_significativo
    db.commit()
    return obtener_configuracion(db)


def redondear(valor: float, decimales: int) -> Decimal:
    return Decimal(str(valor)).quantize(Decimal(1).scaleb(-decimales), rounding=ROUND_HALF_UP)


def _texto(numero: Decimal) -> str:
    return f"{numero:f}".replace(".", ",")


def expresar(
    valor: Optional[float], regla: ReglaExpresionNutriente, expresion_no_significativo: str
) -> Optional[schemas.ExpresionValor]:
    if valor is None:
        return None
    umbral = regla.umbral_no_significativo
    if umbral is not None and valor <= umbral:
        return schemas.ExpresionValor(calculado=valor, valor=0, texto=expresion_no_significativo, no_significativo=True)
    decimales = 0 if regla.entero_desde is not None and valor >= regla.entero_desde else regla.decimales
    numero = redondear(valor, decimales)
    return schemas.ExpresionValor(calculado=valor, valor=float(numero), texto=_texto(numero), no_significativo=False)


def _kilojoules(
    energia: Optional[schemas.ExpresionValor], regla: ReglaExpresionNutriente, expresion_no_significativo: str
) -> Optional[schemas.ExpresionValor]:
    if energia is None:
        return None
    calculado = energia.calculado * FACTOR_KJ_POR_KCAL
    if energia.no_significativo:
        return schemas.ExpresionValor(
            calculado=calculado, valor=0, texto=expresion_no_significativo, no_significativo=True
        )
    numero = redondear(calculado, 0 if regla.entero_desde is not None else regla.decimales)
    return schemas.ExpresionValor(calculado=calculado, valor=float(numero), texto=_texto(numero), no_significativo=False)


def _porcentaje_vd(
    por_porcion: Optional[schemas.ExpresionValor], valor_diario: Optional[float], decimales: int
) -> Optional[schemas.PorcentajeValorDiario]:
    if por_porcion is None or not valor_diario:
        return None
    if por_porcion.no_significativo:
        numero = redondear(0, decimales)
    else:
        numero = redondear(por_porcion.calculado * 100 / valor_diario, decimales)
    return schemas.PorcentajeValorDiario(valor=float(numero), texto=_texto(numero))


def _faltante(guardado) -> schemas.FaltanteNutricional:
    if isinstance(guardado, str):
        return schemas.FaltanteNutricional(tipo=TipoFaltante.OTRO, mensaje=guardado)
    return schemas.FaltanteNutricional.model_validate(guardado)


def obtener_informacion(db: Session, version_id: int) -> schemas.InformacionNutricional:
    version = db.get(VersionReceta, version_id)
    if version is None:
        raise exceptions.VersionNoEncontrada()
    informacion = obtener_o_calcular(db, version)
    db.commit()
    configuracion, valores_diarios, reglas = _cargar(db)
    calculados = {fila.nutriente: fila for fila in informacion.valores}
    no_significativo = configuracion.expresion_no_significativo
    filas = []
    for nutriente, (etiqueta, _, _) in NUTRIENTES.items():
        regla = reglas[nutriente]
        fila = calculados.get(nutriente)
        por_100 = expresar(fila.por_100 if fila else None, regla, no_significativo)
        por_porcion = expresar(fila.por_porcion if fila else None, regla, no_significativo)
        valor_diario = valores_diarios[nutriente].valor
        filas.append(
            schemas.FilaNutricional(
                nutriente=nutriente,
                etiqueta=etiqueta,
                unidad=regla.unidad,
                por_100=por_100,
                por_porcion=por_porcion,
                valor_diario=valor_diario,
                porcentaje_vd=_porcentaje_vd(por_porcion, valor_diario, configuracion.decimales_vd),
            )
        )
    energia = next(fila for fila in filas if fila.nutriente == Nutriente.ENERGIA)
    regla_energia = reglas[Nutriente.ENERGIA]
    return schemas.InformacionNutricional(
        version_id=version.id,
        numero=version.numero,
        estado=version.estado.value,
        completa=informacion.completa,
        calculada_en=informacion.calculada_en,
        base=informacion.base,
        rendimiento_base=informacion.rendimiento_base,
        porcion_base=informacion.porcion_base,
        porcion_medida_casera=version.porcion_medida_casera,
        faltantes=[_faltante(faltante) for faltante in informacion.faltantes],
        filas=filas,
        energia_kj=schemas.EnergiaKilojoules(
            por_100=_kilojoules(energia.por_100, regla_energia, no_significativo),
            por_porcion=_kilojoules(energia.por_porcion, regla_energia, no_significativo),
        ),
        leyenda_vd=configuracion.leyenda_vd,
        expresion_no_significativo=no_significativo,
    )
