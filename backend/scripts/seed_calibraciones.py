"""Registros de calibración y certificados de demostración."""

from datetime import datetime, time, timedelta

from scripts.seed_common import _pdf_certificado
from src.registroCalibracion.models import RegistroCalibracion


def cargar_calibraciones(crear, equipos, hoy, uploads_dir):
    for i, equipo in enumerate(equipos):
        periodicidad = equipo.periodicidad_dias or 180
        antiguedad = [periodicidad + 10, periodicidad - 7, 15][i % 3]
        fecha = hoy - timedelta(days=antiguedad)
        archivo = f"seed-saia-calibracion-{i + 1:02d}.pdf"
        contenido = _pdf_certificado("Registro de verificacion de equipo", ["DEMOSTRACION - NO ES UN CERTIFICADO OFICIAL",
            f"Equipo: {equipo.nombre}", f"Serie: {equipo.numero_serie}", f"Fecha: {fecha.isoformat()}",
            "Responsable: Servicio de metrologia interno SAIA", "Resultado de ejemplo: verificacion satisfactoria."])
        destino = uploads_dir / archivo
        if not destino.exists():
            destino.write_bytes(contenido)
        registro, nuevo = crear(RegistroCalibracion, {"certificado_path": f"/uploads/{archivo}"},
            equipo_id=equipo.id, fecha_calibracion=fecha,
            fecha_vencimiento_calculada=fecha + timedelta(days=periodicidad),
            otorgado_por="Servicio de metrología interno SAIA", fecha_registro=datetime.combine(fecha, time(9)), activo=True)
        if nuevo:
            equipo.fecha_ultima_calibracion = max([fecha, equipo.fecha_ultima_calibracion or fecha])
