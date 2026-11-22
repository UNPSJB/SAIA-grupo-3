from datetime import datetime, time, timedelta
from random import Random

from scripts.panificadora import datos
from scripts.seed_lotes_produccion import asociar_ingredientes_demo, comprobar_origen_demo
from src.loteProduccion.constants import PREFIJO_CODIGO, EstadoLote
from src.loteProduccion.models import LoteProduccion
from src.loteProduccion.services import actualizar_estado_produccion
from src.produccionDelDia.constants import AccionPasoLote, EstadoPasoLote
from src.produccionDelDia.models import MovimientoPasoLote, PasoLote

try:
    from src.loteProduccion.codigo_barras import generar_codigo_barras
except ImportError:
    generar_codigo_barras = None

DIAS_DE_PRODUCCION = 28
OBSERVACIONES = {
    "Pan francés": "Pedido especial de Panadería Los Andes: 20 kg extra de mignon.",
    "Medialunas de manteca": "Se usó la manteca del nuevo proveedor.",
    "Prepizza": "Salsa reforzada según la versión vigente de la receta.",
}


def _version_para(versiones, momento):
    vigentes = [v for v in versiones if v.fecha_creacion <= momento]
    return vigentes[-1] if vigentes else versiones[0]


def planificar(versiones_por_producto, hoy):
    planificados = []
    for dias_atras in range(DIAS_DE_PRODUCCION - 1, -1, -1):
        fecha = hoy - timedelta(days=dias_atras)
        del_dia = []
        for nombre, (dias, factor) in datos.PLAN_PRODUCCION.items():
            if fecha.weekday() not in dias:
                continue
            responsable, hora = datos.RESPONSABLE_PRODUCTO[nombre]
            inicio = datetime.combine(fecha, time(hora, 0))
            version = _version_para(versiones_por_producto[nombre], inicio)
            consumo = [(r.insumo.nombre, round(r.cantidad * factor, 3)) for r in version.renglones]
            del_dia.append({"fecha": fecha, "dias_atras": dias_atras, "nombre": nombre, "factor": factor,
                "responsable": responsable, "hora": hora, "inicio": inicio, "version": version, "consumo": consumo})
        del_dia.sort(key=lambda p: (p["hora"], p["nombre"]))
        for orden, plan in enumerate(del_dia, start=1):
            plan["orden"] = orden
            plan["avance"] = (orden - 1) / len(del_dia)
            planificados.append(plan)
    return planificados


def _estado_objetivo(plan):
    if plan["dias_atras"] >= 2:
        return EstadoLote.CERRADO
    if plan["dias_atras"] == 1:
        return EstadoLote.CERRADO if plan["nombre"] in {"Pan francés", "Medialunas de manteca"} else EstadoLote.FINALIZADO
    if plan["avance"] < 0.3:
        return EstadoLote.FINALIZADO
    if plan["avance"] < 0.65:
        return EstadoLote.EN_PRODUCCION
    return EstadoLote.ABIERTO


def _ejecutor(paso, plan, personas):
    nombre = paso.nombre.lower()
    if "horne" in nombre or "precocción" in nombre or "secado" in nombre:
        return personas["jorge.medina"]
    if "envas" in nombre or "rebanado" in nombre or "embolsado" in nombre or "encajado" in nombre:
        return personas["romina.vera"]
    return personas[plan["responsable"]]


def _valor(rng, paso):
    if not paso.punto_control:
        return None
    nombre = paso.nombre.lower()
    if nombre.startswith("amasado"):
        return round(rng.uniform(24.2, 26.0), 1)
    if nombre.startswith("fermentación"):
        return round((paso.temperatura_celsius or 32) + rng.uniform(-0.8, 0.8), 1)
    if "horne" in nombre or "precocción" in nombre:
        return round(rng.uniform(92.5, 97.0), 1)
    if nombre.startswith("secado"):
        return round(rng.uniform(5.5, 7.8), 1)
    return None


def _crear_pasos(crear, rng, lote, plan, personas, realizados, con_anulacion):
    momento = plan["inicio"]
    for paso_receta in sorted(plan["version"].pasos, key=lambda p: p.orden):
        momento += timedelta(minutes=paso_receta.tiempo_minutos or 15)
        hecho = paso_receta.orden <= realizados
        ejecutor = _ejecutor(paso_receta, plan, personas)
        valor = _valor(rng, paso_receta) if hecho else None
        observacion = "Peso neto y rótulo verificados." if hecho and paso_receta.punto_control and valor is None else None
        paso, _ = crear(PasoLote, {"lote_id": lote.id, "orden": paso_receta.orden},
            paso_receta_id=paso_receta.id, nombre=paso_receta.nombre, procedimiento=paso_receta.procedimiento,
            equipo_id=paso_receta.equipo_id, tiempo_minutos=paso_receta.tiempo_minutos,
            temperatura_celsius=paso_receta.temperatura_celsius, punto_control=paso_receta.punto_control,
            estado=EstadoPasoLote.REALIZADO if hecho else EstadoPasoLote.PENDIENTE,
            realizado_por_id=ejecutor.id if hecho else None, realizado_en=momento if hecho else None,
            valor_medido=valor, observacion=observacion)
        if not hecho:
            continue
        if con_anulacion and paso_receta.orden == 1:
            crear(MovimientoPasoLote, {"paso_id": paso.id, "fecha_hora": momento - timedelta(minutes=12)},
                accion=AccionPasoLote.REALIZADO, personal_id=ejecutor.id)
            crear(MovimientoPasoLote, {"paso_id": paso.id, "fecha_hora": momento - timedelta(minutes=6)},
                accion=AccionPasoLote.ANULADO, personal_id=ejecutor.id,
                motivo="Lo marqué antes de terminar de pesar la levadura.")
        crear(MovimientoPasoLote, {"paso_id": paso.id, "fecha_hora": momento},
            accion=AccionPasoLote.REALIZADO, personal_id=ejecutor.id, valor_medido=valor, observacion=observacion)


def cargar_lotes(db, crear, planificados, insumos, personas, hoy):
    rng = Random(4242)
    calidad = personas["admin"]
    anulado_nombre, anulado_dias, anulado_motivo = datos.LOTE_ANULADO
    pendiente_nombre, pendiente_dias, pendiente_motivo = datos.LOTE_CERRADO_CON_PENDIENTES
    anulacion_hecha = False
    for plan in planificados:
        fecha, nombre = plan["fecha"], plan["nombre"]
        version = plan["version"]
        estado = _estado_objetivo(plan)
        anulado = nombre == anulado_nombre and plan["dias_atras"] == anulado_dias
        con_pendientes = nombre == pendiente_nombre and plan["dias_atras"] == pendiente_dias
        total = len(version.pasos)
        if anulado:
            estado, realizados = EstadoLote.ANULADO, 3
        elif con_pendientes:
            realizados = total - 1
        elif estado in (EstadoLote.CERRADO, EstadoLote.FINALIZADO):
            realizados = total
        elif estado == EstadoLote.EN_PRODUCCION:
            realizados = max(1, total // 2)
        else:
            realizados = 0
        cierre = datetime.combine(fecha + timedelta(days=1), time(17, rng.randint(0, 50)))
        if plan["dias_atras"] == 1 and estado == EstadoLote.CERRADO:
            cierre = datetime.combine(fecha, time(16, 30))
        extra = {}
        if generar_codigo_barras is not None:
            extra["codigo_barras"] = generar_codigo_barras(fecha, plan["orden"])
        lote, nuevo = crear(LoteProduccion, {"codigo": f"{PREFIJO_CODIGO}-{fecha:%Y%m%d}-{plan['orden']:03d}"},
            producto_id=version.receta.producto_id, fecha_produccion=fecha,
            cantidad=round(version.rendimiento_cantidad * plan["factor"], 2),
            observaciones=OBSERVACIONES.get(nombre) if rng.random() < 0.15 else None,
            registrado_por_id=personas[plan["responsable"]].id,
            fecha_registro=plan["inicio"] - timedelta(minutes=20), activo=True, estado=estado,
            version_receta_id=version.id, factor_receta=plan["factor"],
            fecha_cierre=cierre if estado == EstadoLote.CERRADO else None,
            cerrado_por_id=calidad.id if estado == EstadoLote.CERRADO else None,
            fecha_anulacion=datetime.combine(fecha, time(11, 45)) if anulado else None,
            anulado_por_id=calidad.id if anulado else None,
            motivo_anulacion=anulado_motivo if anulado else None,
            pasos_pendientes_al_cerrar=total - realizados if con_pendientes else None,
            motivo_cierre_pendientes=pendiente_motivo if con_pendientes else None, **extra)
        if not nuevo:
            continue
        asociar_ingredientes_demo(db, lote, insumos, receta=plan["consumo"], crear=crear)
        comprobar_origen_demo(db, lote)
        con_anulacion = not anulacion_hecha and estado == EstadoLote.EN_PRODUCCION
        anulacion_hecha = anulacion_hecha or con_anulacion
        _crear_pasos(crear, rng, lote, plan, personas, realizados, con_anulacion)
        if estado in (EstadoLote.ABIERTO, EstadoLote.EN_PRODUCCION, EstadoLote.FINALIZADO):
            db.flush()
            db.expire(lote, ["pasos"])
            actualizar_estado_produccion(lote)
    db.flush()
