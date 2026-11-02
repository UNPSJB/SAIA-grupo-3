"""Historia ficticia de cadena de frío, sin reconvertir equipos existentes."""
from datetime import datetime, time, timedelta

from sqlalchemy import func, select

from src.equipos.models import Equipo, TipoEquipo
from src.registroTemperatura.models import RegistroTemperatura


def cargar_temperaturas(db, crear, sectores, operadores, hoy):
    for indice in range(4):
        equipo, _ = crear(
            Equipo, {"numero_serie": f"SAIA-DEMO-FRIO-{indice + 1:03d}"},
            nombre=f"Congelador DEMO {indice + 1}", tipo=TipoEquipo.EQUIPO,
            sector_id=sectores[indice].id, activo=True,
            controla_temperatura=True, temperatura_minima=-18.0, temperatura_maxima=-12.0,
        )
        # Si administración cambió su configuración, se respeta.
        if (not equipo.activo or not equipo.controla_temperatura
                or equipo.temperatura_minima is None or equipo.temperatura_maxima is None
                or equipo.temperatura_minima >= equipo.temperatura_maxima):
            continue
        primera = db.scalar(select(func.min(RegistroTemperatura.fecha_hora_registro)).where(
            RegistroTemperatura.equipo_id == equipo.id))
        inicio = primera.date() if primera else hoy - timedelta(days=39)
        for dia in range(40):
            fecha = datetime.combine(inicio + timedelta(days=dia), time(9, 30))
            fuera = (dia + indice) % 5 == 0
            temperatura = (equipo.temperatura_maxima + 2 if fuera else
                           (equipo.temperatura_minima + equipo.temperatura_maxima) / 2)
            crear(
                RegistroTemperatura,
                {"equipo_id": equipo.id, "fecha_hora_registro": fecha},
                operario_id=operadores[indice % len(operadores)].id,
                temperatura_registrada=temperatura, fuera_de_rango=fuera,
                accion_tomada="DEMO: se ajustó el termostato y se avisó a mantenimiento." if fuera else None,
            )
