from datetime import datetime, time, timedelta
from random import Random

from scripts.panificadora import datos
from src.checklist.models import AccionMovimiento, EstadoItem, ItemChecklist, MovimientoItemChecklist
from src.checklist.periodos import periodos_entre
from src.consumoQuimico.models import ConsumoQuimico
from src.plan.models import Plan
from src.planRealizado.models import PlanRealizado
from src.tarea.models import FrecuenciaTarea, Tarea, TareaInsumoQuimico
from src.tareaRealizada.models import TareaRealizada

DIAS_DE_HISTORIA = 35
PROBABILIDAD = {FrecuenciaTarea.DIARIA: 0.93, FrecuenciaTarea.SEMANAL: 0.88, FrecuenciaTarea.MENSUAL: 0.85}


def cargar_tareas(crear, equipos, quimicos, elementos):
    tareas = {}
    for clave, (nombre, frecuencia, equipo, procedimiento, consumos, utiles) in datos.TAREAS.items():
        tarea, nueva = crear(Tarea, {"nombre": nombre}, frecuencia=frecuencia, procedimiento=procedimiento,
            equipo_id=equipos[equipo].id if equipo else None)
        if nueva:
            tarea.elementos = [elementos[n] for n in utiles]
            for quimico, cantidad in consumos:
                crear(TareaInsumoQuimico, {"tarea_id": tarea.id, "insumo_quimico_id": quimicos[quimico].id},
                    cantidad=cantidad)
        tareas[clave] = tarea
    return tareas


def cargar_planes(crear, sectores, equipos, tareas, personas, hoy):
    planes = []
    for nombre, descripcion, sector, equipo, responsable, claves, inicio, fin, activo in datos.PLANES:
        plan, nuevo = crear(Plan, {"nombre": nombre}, descripcion=descripcion,
            sector_id=sectores[sector].id if sector else None,
            equipo_id=equipos[equipo].id if equipo else None,
            responsable_id=personas[responsable].id, activo=activo,
            fecha_inicio=hoy + timedelta(days=inicio),
            fecha_fin=hoy + timedelta(days=fin) if fin is not None else None)
        if nuevo:
            plan.tareas = [tareas[c] for c in claves]
        planes.append(plan)
    return planes


def _momento(rng, frecuencia, inicio, fin, hoy, indice):
    if frecuencia == FrecuenciaTarea.DIARIA:
        dia = inicio
        hora = time(11, 0) if dia.weekday() == 6 else time(14, 0)
    elif frecuencia == FrecuenciaTarea.SEMANAL:
        dia = min(inicio + timedelta(days=5), fin)
        hora = time(15, 0)
    else:
        dia = min(inicio + timedelta(days=rng.randint(3, 20)), fin)
        hora = time(15, 30)
    base = datetime.combine(dia, hora) + timedelta(minutes=rng.randint(0, 50) + indice * 7)
    if dia == hoy:
        base = datetime.combine(hoy, time(10, 0)) + timedelta(minutes=rng.randint(0, 40) + indice * 7)
    return base


def _realizada(rng, frecuencia, inicio, fin, hoy, momento):
    if momento.date() > hoy:
        return False
    if fin < hoy:
        probabilidad = PROBABILIDAD[frecuencia]
        if frecuencia == FrecuenciaTarea.DIARIA and inicio.weekday() == 6:
            probabilidad = 0.75
        return rng.random() < probabilidad
    if momento.date() == hoy:
        return rng.random() < 0.35
    return rng.random() < 0.6


def _registrar(crear, plan, tarea, item, momento, foto):
    crear(MovimientoItemChecklist, {"item_id": item.id, "accion": AccionMovimiento.REALIZADA},
        personal_id=plan.responsable_id, fecha_hora=momento, foto_path=foto)
    realizado, _ = crear(PlanRealizado, {"plan_origen_id": plan.id, "fecha_ejecucion": momento},
        nombre=plan.nombre, descripcion=plan.descripcion, responsable_id=plan.responsable_id,
        sector_id=plan.sector_id, equipo_id=plan.equipo_id)
    consumos = [(r.insumo_quimico, r.cantidad) for r in tarea.insumos_quimicos]
    crear(TareaRealizada, {"plan_realizado_id": realizado.id, "tarea_origen_id": tarea.id},
        nombre=tarea.nombre, frecuencia=tarea.frecuencia, procedimiento=tarea.procedimiento,
        fecha_registro=momento, equipo_id=tarea.equipo_id, foto_path=foto,
        elementos_utilizados=[{"id": e.id, "nombre": e.nombre} for e in tarea.elementos],
        insumos_utilizados=[{"id": q.id, "nombre": q.nombre, "cantidad": c} for q, c in consumos])
    for quimico, cantidad in consumos:
        crear(ConsumoQuimico, {"insumo_quimico_id": quimico.id, "fecha": momento.date(),
            "tarea_limpieza": tarea.nombre, "operario_id": plan.responsable_id},
            cantidad_utilizada=cantidad, activo=True)


def cargar_historial_checklist(db, crear, planes, fotos, hoy):
    rng = Random(20261122)
    for plan in planes:
        if not plan.activo:
            continue
        desde = max(plan.fecha_inicio, hoy - timedelta(days=DIAS_DE_HISTORIA))
        hasta = min(plan.fecha_fin or hoy, hoy)
        if desde > hasta:
            continue
        for indice, tarea in enumerate(plan.tareas):
            for inicio, fin in periodos_entre(tarea.frecuencia, desde, hasta):
                momento = _momento(rng, tarea.frecuencia, inicio, fin, hoy, indice)
                realizada = _realizada(rng, tarea.frecuencia, inicio, fin, hoy, momento)
                foto = fotos[rng.randrange(len(fotos))] if realizada and rng.random() < 0.15 else None
                item, nuevo = crear(ItemChecklist, {"plan_id": plan.id, "tarea_id": tarea.id,
                    "frecuencia": tarea.frecuencia, "periodo_inicio": inicio}, periodo_fin=fin,
                    responsable_id=plan.responsable_id,
                    realizada_por_id=plan.responsable_id if realizada else None,
                    estado=EstadoItem.REALIZADA if realizada else EstadoItem.PENDIENTE,
                    realizada_en=momento if realizada else None, foto_path=foto)
                if nuevo and realizada:
                    _registrar(crear, plan, tarea, item, momento, foto)
    db.flush()
