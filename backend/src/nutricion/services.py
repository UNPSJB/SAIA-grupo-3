import csv
import io
from datetime import datetime
from typing import Optional

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from src.insumos.constants import TipoInsumo
from src.insumos.models import Insumo
from src.nutricion import exceptions, schemas
from src.nutricion.constants import (
    COLUMNAS_CSV,
    ErrorCode,
    FACTOR_KJ_POR_KCAL,
    NUTRIENTES,
    NUTRIENTES_DE_ADITIVO,
    AccionHistorial,
    FuenteNutricional,
    Nutriente,
)
from src.nutricion.models import AlimentoReferencia, HistorialValorNutricional, ValorNutricionalInsumo
from src.personal.models import Personal

EPSILON = 1e-9


def _leer_insumo(db: Session, insumo_id: int) -> Insumo:
    insumo = db.get(Insumo, insumo_id)
    if insumo is None:
        raise exceptions.InsumoNoEncontrado()
    return insumo


def nutrientes_permitidos(insumo: Insumo) -> list[Nutriente]:
    if insumo.tipo == TipoInsumo.ADITIVO:
        return [n for n in NUTRIENTES if n in NUTRIENTES_DE_ADITIVO] if insumo.aporta_energia_sodio else []
    return list(NUTRIENTES)


def _validar_permitidos(insumo: Insumo, nutrientes) -> None:
    permitidos = set(nutrientes_permitidos(insumo))
    if insumo.tipo == TipoInsumo.ADITIVO and not permitidos:
        raise exceptions.AditivoSinAporte()
    if any(nutriente not in permitidos for nutriente in nutrientes):
        raise exceptions.NutrienteNoPermitidoAditivo()


def _validar_coherencia(valores: dict[Nutriente, float]) -> None:
    def mayor(a: Nutriente, b: float | None) -> bool:
        return a in valores and b is not None and valores[a] > b + EPSILON

    if mayor(Nutriente.AZUCARES_TOTALES, valores.get(Nutriente.CARBOHIDRATOS)):
        raise exceptions.ValoresIncoherentes(ErrorCode.AZUCARES_SUPERAN_CARBOHIDRATOS)
    if mayor(Nutriente.AZUCARES_ANADIDOS, valores.get(Nutriente.AZUCARES_TOTALES)):
        raise exceptions.ValoresIncoherentes(ErrorCode.ANADIDOS_SUPERAN_TOTALES)
    grasas = valores.get(Nutriente.GRASAS_TOTALES)
    parciales = [valores[n] for n in (Nutriente.GRASAS_SATURADAS, Nutriente.GRASAS_TRANS) if n in valores]
    if grasas is not None and parciales and sum(parciales) > grasas + EPSILON:
        raise exceptions.ValoresIncoherentes(ErrorCode.GRASAS_INCOHERENTES)


def _valores_actuales(db: Session, insumo_id: int) -> dict[Nutriente, ValorNutricionalInsumo]:
    filas = db.scalars(select(ValorNutricionalInsumo).where(ValorNutricionalInsumo.insumo_id == insumo_id))
    return {fila.nutriente: fila for fila in filas}


def _historial(db, insumo_id, nutriente, accion, anterior, nuevo, persona, ahora, fuente=None, detalle=None, alimento_id=None):
    db.add(
        HistorialValorNutricional(
            insumo_id=insumo_id,
            nutriente=nutriente,
            accion=accion,
            valor_anterior=anterior,
            valor_nuevo=nuevo,
            fuente=fuente,
            detalle_fuente=detalle,
            alimento_referencia_id=alimento_id,
            personal_id=persona.id,
            fecha_hora=ahora,
        )
    )


def cargar_valores(
    db: Session,
    insumo: Insumo,
    nuevos: dict[Nutriente, Optional[float]],
    fuente: FuenteNutricional,
    detalle: Optional[str],
    alimento_id: Optional[int],
    accion: AccionHistorial,
    persona: Personal,
) -> None:
    actuales = _valores_actuales(db, insumo.id)
    final = {n: fila.valor for n, fila in actuales.items()}
    for nutriente, valor in nuevos.items():
        if valor is None:
            final.pop(nutriente, None)
        else:
            final[nutriente] = valor
    _validar_coherencia(final)
    ahora = datetime.now()
    for nutriente, valor in nuevos.items():
        fila = actuales.get(nutriente)
        if valor is None:
            if fila is not None:
                _historial(db, insumo.id, nutriente, AccionHistorial.BORRADO, fila.valor, None, persona, ahora)
                db.delete(fila)
            continue
        if (
            fila is not None
            and not fila.modificado
            and abs(fila.valor - valor) <= EPSILON
            and fila.fuente == fuente
            and fila.detalle_fuente == detalle
            and fila.alimento_referencia_id == alimento_id
        ):
            continue
        anterior = fila.valor if fila else None
        if fila is None:
            fila = ValorNutricionalInsumo(insumo_id=insumo.id, nutriente=nutriente)
            db.add(fila)
        fila.valor = valor
        fila.valor_fuente = valor
        fila.fuente = fuente
        fila.detalle_fuente = detalle
        fila.alimento_referencia_id = alimento_id
        fila.cargado_por_id = persona.id
        fila.cargado_en = ahora
        fila.modificado = False
        fila.modificado_por_id = None
        fila.modificado_en = None
        _historial(db, insumo.id, nutriente, accion, anterior, valor, persona, ahora, fuente, detalle, alimento_id)


def cargar_manual(db: Session, insumo_id: int, datos: schemas.CargaManual, persona: Personal) -> schemas.DatosNutricionales:
    insumo = _leer_insumo(db, insumo_id)
    _validar_permitidos(insumo, [n for n, v in datos.valores.items() if v is not None])
    cargar_valores(db, insumo, datos.valores, datos.fuente, datos.detalle_fuente, None, AccionHistorial.CARGA_MANUAL, persona)
    db.commit()
    return obtener_datos(db, insumo_id)


def valores_de_alimento(alimento: AlimentoReferencia) -> dict[Nutriente, float]:
    return {
        nutriente: getattr(alimento, campo)
        for nutriente, (_, _, campo) in NUTRIENTES.items()
        if getattr(alimento, campo) is not None
    }


def copiar_referencia(db: Session, insumo_id: int, datos: schemas.CopiaReferencia, persona: Personal) -> schemas.DatosNutricionales:
    insumo = _leer_insumo(db, insumo_id)
    alimento = db.get(AlimentoReferencia, datos.alimento_referencia_id)
    if alimento is None:
        raise exceptions.AlimentoNoEncontrado()
    permitidos = set(nutrientes_permitidos(insumo))
    if insumo.tipo == TipoInsumo.ADITIVO and not permitidos:
        raise exceptions.AditivoSinAporte()
    valores = {n: v for n, v in valores_de_alimento(alimento).items() if n in permitidos}
    detalle = f"{alimento.fuente} · {alimento.codigo} · {alimento.nombre}"
    cargar_valores(db, insumo, valores, FuenteNutricional.BASE_REFERENCIA, detalle, alimento.id, AccionHistorial.COPIA_REFERENCIA, persona)
    db.commit()
    return obtener_datos(db, insumo_id)


def modificar_valores(db: Session, insumo_id: int, datos: schemas.ModificacionValores, persona: Personal) -> schemas.DatosNutricionales:
    insumo = _leer_insumo(db, insumo_id)
    _validar_permitidos(insumo, list(datos.valores))
    actuales = _valores_actuales(db, insumo_id)
    if any(nutriente not in actuales for nutriente in datos.valores):
        raise exceptions.ValorInexistente()
    final = {n: fila.valor for n, fila in actuales.items()} | dict(datos.valores)
    _validar_coherencia(final)
    ahora = datetime.now()
    for nutriente, valor in datos.valores.items():
        fila = actuales[nutriente]
        if abs(fila.valor - valor) <= EPSILON:
            continue
        anterior = fila.valor
        fila.valor = valor
        fila.modificado = abs(valor - fila.valor_fuente) > EPSILON
        fila.modificado_por_id = persona.id if fila.modificado else None
        fila.modificado_en = ahora if fila.modificado else None
        _historial(db, insumo_id, nutriente, AccionHistorial.MODIFICACION, anterior, valor, persona, ahora, fila.fuente, fila.detalle_fuente, fila.alimento_referencia_id)
    db.commit()
    return obtener_datos(db, insumo_id)


def obtener_datos(db: Session, insumo_id: int) -> schemas.DatosNutricionales:
    insumo = _leer_insumo(db, insumo_id)
    permitidos = nutrientes_permitidos(insumo)
    actuales = _valores_actuales(db, insumo_id)
    valores = [
        schemas.ValorNutricional(
            nutriente=nutriente,
            etiqueta=NUTRIENTES[nutriente][0],
            unidad=NUTRIENTES[nutriente][1],
            valor=fila.valor,
            fuente=fila.fuente,
            detalle_fuente=fila.detalle_fuente,
            alimento_referencia=fila.alimento_referencia,
            valor_fuente=fila.valor_fuente,
            cargado_por=fila.cargado_por,
            cargado_en=fila.cargado_en,
            modificado=fila.modificado,
            modificado_por=fila.modificado_por,
            modificado_en=fila.modificado_en,
        )
        for nutriente in NUTRIENTES
        if (fila := actuales.get(nutriente)) is not None
    ]
    energia = actuales.get(Nutriente.ENERGIA)
    return schemas.DatosNutricionales(
        insumo=insumo,
        requiere_datos=bool(permitidos) and insumo.tipo == TipoInsumo.INGREDIENTE,
        nutrientes=[
            schemas.NutrienteDisponible(nutriente=n, etiqueta=NUTRIENTES[n][0], unidad=NUTRIENTES[n][1])
            for n in permitidos
        ],
        valores=valores,
        energia_kj=round(energia.valor * FACTOR_KJ_POR_KCAL, 1) if energia else None,
        faltantes=[n for n in permitidos if n not in actuales],
    )


def listar_historial(db: Session, insumo_id: int) -> list[schemas.MovimientoHistorial]:
    _leer_insumo(db, insumo_id)
    filas = db.scalars(
        select(HistorialValorNutricional)
        .where(HistorialValorNutricional.insumo_id == insumo_id)
        .order_by(HistorialValorNutricional.fecha_hora.desc(), HistorialValorNutricional.id.desc())
    )
    return [
        schemas.MovimientoHistorial(
            id=fila.id,
            nutriente=fila.nutriente,
            etiqueta=NUTRIENTES[fila.nutriente][0],
            accion=fila.accion,
            valor_anterior=fila.valor_anterior,
            valor_nuevo=fila.valor_nuevo,
            fuente=fila.fuente,
            detalle_fuente=fila.detalle_fuente,
            alimento_referencia=fila.alimento_referencia,
            personal=fila.personal,
            fecha_hora=fila.fecha_hora,
        )
        for fila in filas
    ]


def buscar_alimentos(db: Session, buscar: str = "", limite: int = 30) -> list[AlimentoReferencia]:
    query = select(AlimentoReferencia).order_by(AlimentoReferencia.nombre).limit(limite)
    termino = buscar.strip().lower()
    if termino:
        query = query.where(
            or_(
                func.lower(AlimentoReferencia.nombre).contains(termino),
                func.lower(AlimentoReferencia.codigo).contains(termino),
                func.lower(AlimentoReferencia.grupo).contains(termino),
            )
        )
    return list(db.scalars(query))


def _numero(texto: str) -> Optional[float]:
    texto = (texto or "").strip().replace(",", ".")
    if not texto or texto in {"-", "s/d", "nd"}:
        return None
    valor = float(texto)
    if valor < 0:
        raise ValueError(ErrorCode.VALOR_NEGATIVO)
    return valor


def importar_csv(db: Session, contenido: str, fuente: str, confirmar: bool = True) -> schemas.ResultadoImportacion:
    fuente = fuente.strip()
    if not fuente:
        raise exceptions.ArchivoInvalido("indicá el nombre de la fuente.")
    try:
        dialecto = csv.Sniffer().sniff(contenido.splitlines()[0] if contenido else "", delimiters=",;\t")
    except csv.Error as error:
        raise exceptions.ArchivoInvalido("no se reconoce el separador.") from error
    lector = csv.DictReader(io.StringIO(contenido), dialect=dialecto)
    encabezados = {(nombre or "").strip().lower() for nombre in (lector.fieldnames or [])}
    faltantes = [col for col in ("codigo", "nombre") if col not in encabezados]
    if faltantes:
        raise exceptions.ArchivoInvalido(f"faltan las columnas {', '.join(faltantes)}.")
    existentes = {
        alimento.codigo: alimento
        for alimento in db.scalars(select(AlimentoReferencia).where(AlimentoReferencia.fuente == fuente))
    }
    resultado = schemas.ResultadoImportacion(fuente=fuente, creados=0, actualizados=0, sin_cambios=0, errores=[])
    for numero, fila in enumerate(lector, start=2):
        fila = {(clave or "").strip().lower(): (valor or "").strip() for clave, valor in fila.items()}
        codigo, nombre = fila.get("codigo", ""), fila.get("nombre", "")
        if not codigo or not nombre:
            resultado.errores.append(f"Fila {numero}: falta el código o el nombre.")
            continue
        try:
            datos = {campo: _numero(fila.get(campo, "")) for campo in COLUMNAS_CSV[3:]}
        except ValueError:
            resultado.errores.append(f"Fila {numero} ({codigo}): hay un valor que no es un número válido.")
            continue
        datos["nombre"] = nombre[:200]
        datos["grupo"] = (fila.get("grupo") or None) and fila["grupo"][:100]
        alimento = existentes.get(codigo)
        if alimento is None:
            alimento = AlimentoReferencia(fuente=fuente, codigo=codigo[:40], **datos)
            db.add(alimento)
            existentes[codigo] = alimento
            resultado.creados += 1
        elif any(getattr(alimento, campo) != valor for campo, valor in datos.items()):
            for campo, valor in datos.items():
                setattr(alimento, campo, valor)
            alimento.importado_en = datetime.now()
            resultado.actualizados += 1
        else:
            resultado.sin_cambios += 1
    if confirmar:
        db.commit()
    else:
        db.flush()
    return resultado
