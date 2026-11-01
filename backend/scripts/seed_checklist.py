"""Checklist diario, cumplimiento histórico y consumos de limpieza."""

from datetime import datetime, time, timedelta

from src.checklist.models import (
    AccionMovimiento,
    EstadoItem,
    ItemChecklist,
    MovimientoItemChecklist,
)
from src.consumoQuimico.models import ConsumoQuimico
from src.planRealizado.models import PlanRealizado
from src.tarea.models import FrecuenciaTarea
from src.tareaRealizada.models import TareaRealizada


def cargar_checklist(crear, equipos, planes, tareas, quimicos, elementos, fotos, hoy, ayer):
    for i, equipo in enumerate(equipos):
        plan, tarea, quimico, elemento = planes[i], tareas[i], quimicos[i], elementos[i]
        momento = datetime.combine(ayer, time(10, i))
        responsable = plan.responsable_id
        foto = fotos[1 if i == 11 else 2 if i in (4, 5) else 0]
        item, _ = crear(ItemChecklist, {"plan_id": plan.id, "tarea_id": tarea.id,
            "frecuencia": FrecuenciaTarea.DIARIA, "periodo_inicio": ayer}, periodo_fin=ayer,
            responsable_id=responsable, realizada_por_id=responsable, estado=EstadoItem.REALIZADA,
            realizada_en=momento, foto_path=foto)
        crear(MovimientoItemChecklist, {"item_id": item.id, "accion": AccionMovimiento.REALIZADA},
            personal_id=responsable, fecha_hora=momento, foto_path=foto)
        plan_realizado, _ = crear(PlanRealizado, {"plan_origen_id": plan.id, "fecha_ejecucion": momento},
            nombre=plan.nombre, descripcion=plan.descripcion, responsable_id=responsable,
            sector_id=plan.sector_id, equipo_id=equipo.id)
        crear(TareaRealizada, {"plan_realizado_id": plan_realizado.id, "tarea_origen_id": tarea.id},
            nombre=tarea.nombre, frecuencia=tarea.frecuencia, procedimiento=tarea.procedimiento,
            fecha_registro=momento, equipo_id=equipo.id, foto_path=foto,
            elementos_utilizados=[{"id": elemento.id, "nombre": elemento.nombre}],
            insumos_utilizados=[{"id": quimico.id, "nombre": quimico.nombre, "cantidad": 0.25}])
        crear(ConsumoQuimico, {"insumo_quimico_id": quimico.id, "fecha": ayer, "tarea_limpieza": tarea.nombre},
            operario_id=responsable, cantidad_utilizada=0.25, activo=True)
        # Pendientes de hoy para probar el checklist sin consumir stock ni finalizar tareas.
        crear(ItemChecklist, {"plan_id": plan.id, "tarea_id": tarea.id,
            "frecuencia": FrecuenciaTarea.DIARIA, "periodo_inicio": hoy}, periodo_fin=hoy,
            responsable_id=responsable, estado=EstadoItem.PENDIENTE)
        #datos ficticios para el grafico de cumplimiento
        for dias_atras in range(2, 31):
            fecha = hoy - timedelta(days=dias_atras)
            fin_de_semana = fecha.weekday() >= 5
            semana_baja = 14 <= dias_atras <= 20
            cumplida = not ((fin_de_semana and i % 2 == 0) or (semana_baja and i % 3 == 0))
            crear(ItemChecklist, {"plan_id": plan.id, "tarea_id": tarea.id,
                "frecuencia": FrecuenciaTarea.DIARIA, "periodo_inicio": fecha}, periodo_fin=fecha,
                responsable_id=responsable,
                realizada_por_id=responsable if cumplida else None,
                estado=EstadoItem.REALIZADA if cumplida else EstadoItem.PENDIENTE,
                realizada_en=datetime.combine(fecha, time(10, i)) if cumplida else None)
