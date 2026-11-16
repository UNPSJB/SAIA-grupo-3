from dataclasses import dataclass, field
from typing import Optional

from src.nutricion.constants import NUTRIENTES, Nutriente
from src.rotuladoFrontal.constants import (
    ETIQUETAS_HECHO,
    AplicaA,
    Comparacion,
    Formula,
    Hecho,
    OperadorRegla,
    ResultadoAplicabilidad,
    Sello,
    TipoProducto,
)

SIMBOLOS = {Comparacion.MAYOR_O_IGUAL: "≥", Comparacion.MAYOR: ">"}
PLURALES = {AplicaA.SOLIDO: "sólidos", AplicaA.LIQUIDO: "líquidos"}


@dataclass
class ResultadoRegla:
    resultado: ResultadoAplicabilidad
    mensaje: str
    regla_orden: Optional[int]


@dataclass
class EntradaSellos:
    tipo: TipoProducto
    por_100: dict[Nutriente, Optional[float]]
    energia_porcion: Optional[float] = None
    hechos: set[Hecho] = field(default_factory=set)


@dataclass
class DetalleUmbral:
    orden: int
    sello: Sello
    leyenda: str
    nutriente: Nutriente
    formula: Formula
    evaluado: bool
    motivo: Optional[str] = None
    datos: dict[str, float] = field(default_factory=dict)
    operacion: Optional[str] = None
    valor: Optional[float] = None
    limite: float = 0
    unidad: str = ""
    comparacion: Comparacion = Comparacion.MAYOR_O_IGUAL
    supera: bool = False


@dataclass
class ResultadoSellos:
    sellos: list[Sello]
    leyendas: list[str]
    advertencias: list[str]
    detalle: list[DetalleUmbral]


def _numero(valor: float) -> str:
    return f"{valor:.2f}".rstrip("0").rstrip(".").replace(".", ",")


def evaluar_aplicabilidad(reglas, hechos: set[Hecho]) -> ResultadoRegla:
    for regla in reglas:
        consultados = [Hecho(h) for h in regla.hechos]
        verdaderos = [h for h in consultados if h in hechos]
        coincide = {
            OperadorRegla.ALGUNO: bool(verdaderos),
            OperadorRegla.TODOS: bool(consultados) and len(verdaderos) == len(consultados),
            OperadorRegla.NINGUNO: not verdaderos,
            OperadorRegla.SIEMPRE: True,
        }[regla.operador]
        if coincide:
            return ResultadoRegla(regla.resultado, regla.mensaje, regla.orden)
    return ResultadoRegla(ResultadoAplicabilidad.CORRESPONDE, "Ninguna regla de aplicabilidad coincidió.", None)


def _supera(valor: float, limite: float, comparacion: Comparacion) -> bool:
    return valor >= limite if comparacion == Comparacion.MAYOR_O_IGUAL else valor > limite


def _calcular(umbral, entrada: EntradaSellos, detalle: DetalleUmbral) -> None:
    nombre = NUTRIENTES[umbral.nutriente][0].lower()
    unidad_dato = NUTRIENTES[umbral.nutriente][1]
    cantidad = entrada.por_100.get(umbral.nutriente)
    energia = entrada.por_100.get(Nutriente.ENERGIA)
    if cantidad is None:
        detalle.motivo = f"Falta el valor de {nombre} por 100."
        return
    if umbral.formula == Formula.CANTIDAD_POR_100:
        detalle.datos = {umbral.nutriente.value: cantidad}
        detalle.valor = cantidad
        detalle.operacion = f"{_numero(cantidad)} {unidad_dato} por 100 g o ml"
    else:
        if not energia:
            detalle.motivo = "El producto no aporta energía: no se puede calcular por kcal."
            return
        detalle.datos = {umbral.nutriente.value: cantidad, Nutriente.ENERGIA.value: energia}
        if umbral.formula == Formula.PORCENTAJE_ENERGIA:
            factor = umbral.factor_energetico
            detalle.datos["factor_energetico"] = factor
            detalle.valor = cantidad * factor * 100 / energia
            detalle.operacion = (
                f"{_numero(cantidad)} g × {_numero(factor)} kcal/g × 100 ÷ {_numero(energia)} kcal"
                f" = {_numero(detalle.valor)} %"
            )
        else:
            detalle.valor = cantidad / energia
            detalle.operacion = f"{_numero(cantidad)} mg ÷ {_numero(energia)} kcal = {_numero(detalle.valor)} mg/kcal"
    detalle.evaluado = True
    detalle.supera = _supera(detalle.valor, umbral.limite, umbral.comparacion)


def evaluar_sellos(umbrales, advertencias, entrada: EntradaSellos) -> ResultadoSellos:
    detalles: list[DetalleUmbral] = []
    dependientes = []
    for umbral in umbrales:
        detalle = DetalleUmbral(
            orden=umbral.orden,
            sello=umbral.sello,
            leyenda=umbral.leyenda,
            nutriente=umbral.nutriente,
            formula=umbral.formula,
            evaluado=False,
            limite=umbral.limite,
            unidad=umbral.unidad,
            comparacion=umbral.comparacion,
        )
        detalles.append(detalle)
        if umbral.aplica_a != AplicaA.AMBOS and umbral.aplica_a.value != entrada.tipo.value:
            detalle.motivo = f"Aplica solo a productos {PLURALES[umbral.aplica_a]}."
            continue
        if umbral.energia_maxima_porcion is not None and (
            entrada.energia_porcion is None or entrada.energia_porcion > umbral.energia_maxima_porcion
        ):
            detalle.motivo = (
                f"Aplica solo con {_numero(umbral.energia_maxima_porcion)} kcal o menos por porción."
            )
            continue
        if umbral.requiere_agregado and Hecho(umbral.requiere_agregado) not in entrada.hechos:
            detalle.motivo = f"No se evalúa porque el producto no {ETIQUETAS_HECHO[Hecho(umbral.requiere_agregado)]}."
            continue
        _calcular(umbral, entrada, detalle)
        if umbral.requiere_alguno_de:
            dependientes.append((umbral, detalle))
    dependientes_ids = {id(detalle) for _, detalle in dependientes}
    con_sello = {d.sello for d in detalles if d.supera and id(d) not in dependientes_ids}
    for umbral, detalle in dependientes:
        requeridos = [Sello(s) for s in umbral.requiere_alguno_de]
        if detalle.supera and not any(s in con_sello for s in requeridos):
            detalle.supera = False
            detalle.motivo = "Supera el límite, pero solo corresponde junto con otro sello de " + ", ".join(
                s.value.replace("_", " ") for s in requeridos
            ) + "."
    sellos: list[Sello] = []
    leyendas: list[str] = []
    for detalle in detalles:
        if detalle.supera and detalle.sello not in sellos:
            sellos.append(detalle.sello)
            leyendas.append(detalle.leyenda)
    textos = [a.texto for a in advertencias if Hecho(a.hecho) in entrada.hechos]
    return ResultadoSellos(sellos=sellos, leyendas=leyendas, advertencias=textos, detalle=detalles)


def simbolo(comparacion: Comparacion) -> str:
    return SIMBOLOS[comparacion]
