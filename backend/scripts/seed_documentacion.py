"""Documentación del personal y notificaciones de ejemplo."""

from datetime import datetime, time, timedelta

from src.documentacion.models import Documentacion
from src.notificaciones.models import Notificacion, TipoNotificacion
from src.tipoDocumento.models import TipoDocumento


TIPOS_DOCUMENTO = ["Carnet de manipulador de alimentos", "Libreta sanitaria", "Apto psicofísico",
    "Certificado de capacitación en BPM", "Capacitación en POES", "Constancia de higiene de manos",
    "Capacitación en alérgenos", "Capacitación en trazabilidad", "Inducción de seguridad e higiene",
    "Capacitación en manejo de químicos", "Constancia de uso de EPP", "Capacitación en control de plagas",
    "Capacitación en cadena de frío", "Capacitación en gestión de residuos", "Aptitud para tareas de cocina"]

def cargar_documentacion(crear, operadores, hoy):
    for i, nombre in enumerate(TIPOS_DOCUMENTO):
        tipo, _ = crear(TipoDocumento, {"nombre": nombre}, activo=True)
        crear(Documentacion, {"personal_id": operadores[i % len(operadores)].id, "tipo_documento_id": tipo.id},
            fecha_vencimiento=hoy + timedelta(days=[-7, 0, 7, 30, 90][i % 5]))
        crear(Notificacion, {"clave": f"seed-saia-documentacion-{i + 1:02d}"},
            tipo=TipoNotificacion.VENCIMIENTO_DOCUMENTACION,
            titulo=f"Control documental: {nombre}"[:100],
            mensaje=f"Revisar la vigencia de {nombre.lower()} del personal asignado.",
            enlace="/personal/vencimientos", fecha_creacion=datetime.combine(hoy - timedelta(days=1), time(8, i)), leida=i >= 5)
