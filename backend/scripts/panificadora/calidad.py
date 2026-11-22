from datetime import datetime, time, timedelta
from random import Random

from scripts.panificadora import datos
from scripts.seed_common import _pdf_certificado
from scripts.seed_incidentes import TIPO_INCIDENTE_INACTIVO, TIPOS_INCIDENTE
from src.accionCorrectiva.models import AccionCorrectiva
from src.documentacion.models import Documentacion
from src.documentoTecnico.models import (
    CambioVigenciaDocumentoTecnico,
    DocumentoTecnico,
    EstadoDocumento,
    TipoDocumentoTecnico,
    VersionDocumentoTecnico,
)
from src.incidente.auditoria import AccionMovimientoIncidente, MovimientoIncidente
from src.incidente.constants import EstadoIncidente
from src.incidente.models import Incidente
from src.notificaciones.models import Notificacion, TipoNotificacion
from src.registroCalibracion.models import RegistroCalibracion
from src.registroTemperatura.models import RegistroTemperatura
from src.tipoDocumento.models import TipoDocumento
from src.tipoIncidente.models import TipoIncidente

ACCIONES_TEMPERATURA = [
    "Se cerró correctamente la puerta y se repitió la medición a los 30 minutos.",
    "Se ajustó el termostato y se avisó a mantenimiento.",
    "Se trasladó la mercadería sensible al equipo de respaldo hasta normalizar.",
]


def cargar_temperaturas(crear, equipos, operadores, hoy):
    rng = Random(7)
    controlados = [e for e in equipos.values() if e.controla_temperatura]
    for equipo in controlados:
        minima, maxima = equipo.temperatura_minima, equipo.temperatura_maxima
        centro = (minima + maxima) / 2
        for dias_atras in range(35, -1, -1):
            for hora in (time(6, 30), time(14, 30)):
                momento = datetime.combine(hoy - timedelta(days=dias_atras), hora)
                if momento > datetime.combine(hoy, time(12)):
                    continue
                fuera = rng.random() < 0.04
                valor = maxima + rng.uniform(0.5, 3.5) if fuera else centro + rng.uniform(-1.5, 1.5)
                accion = rng.choice(ACCIONES_TEMPERATURA) if fuera else None
                registro, nuevo = crear(RegistroTemperatura, {"equipo_id": equipo.id, "fecha_hora_registro": momento},
                    operario_id=operadores[rng.randrange(len(operadores))].id,
                    temperatura_registrada=round(valor, 1), fuera_de_rango=fuera, accion_tomada=accion)
                if nuevo and fuera:
                    crear(Notificacion, {"clave": f"panificadora-temperatura-{registro.id}"},
                        tipo=TipoNotificacion.TEMPERATURA_FUERA_RANGO,
                        titulo=f"Temperatura fuera de rango: {equipo.nombre}"[:100],
                        mensaje=f"{equipo.nombre}: {registro.temperatura_registrada:g} °C. {accion}"[:250],
                        enlace=f"/equipos/{equipo.id}", fecha_creacion=momento,
                        leida=dias_atras > 3, resuelta=dias_atras > 1)


def cargar_calibraciones(crear, equipos, hoy, uploads_dir):
    for clave, antiguedad in datos.CALIBRACIONES.items():
        equipo = equipos[clave]
        fecha = hoy - timedelta(days=antiguedad)
        archivo = f"panificadora-calibracion-{equipo.numero_serie.lower()}.pdf"
        contenido = _pdf_certificado("Certificado de calibracion", [
            "Documento de demostracion - sin validez oficial",
            f"Equipo: {equipo.nombre}", f"Serie: {equipo.numero_serie}",
            f"Fecha: {fecha.isoformat()}", "Laboratorio de Metrologia del Oeste (ficticio)",
            "Resultado: dentro de tolerancia."])
        destino = uploads_dir / archivo
        if not destino.exists():
            destino.write_bytes(contenido)
        _, nuevo = crear(RegistroCalibracion, {"certificado_path": f"/uploads/{archivo}"},
            equipo_id=equipo.id, fecha_calibracion=fecha,
            fecha_vencimiento_calculada=fecha + timedelta(days=equipo.periodicidad_dias),
            otorgado_por="Laboratorio de Metrología del Oeste", fecha_registro=datetime.combine(fecha, time(11)),
            activo=True)
        if nuevo:
            equipo.fecha_ultima_calibracion = fecha


def cargar_documentacion(crear, personas, hoy):
    tipos = {}
    for nombre in datos.TIPOS_DOCUMENTO:
        tipo, _ = crear(TipoDocumento, {"nombre": nombre}, activo=True)
        tipos[nombre] = tipo
    for usuario, documentos in datos.DOCUMENTACION.items():
        persona = personas[usuario]
        for nombre, dias in documentos:
            vencimiento = hoy + timedelta(days=dias)
            crear(Documentacion, {"personal_id": persona.id, "tipo_documento_id": tipos[nombre].id},
                fecha_vencimiento=vencimiento)
            if dias <= 15:
                estado = "venció" if dias < 0 else "vence hoy" if dias == 0 else f"vence en {dias} días"
                crear(Notificacion, {"clave": f"panificadora-documentacion-{persona.id}-{tipos[nombre].id}"},
                    tipo=TipoNotificacion.VENCIMIENTO_DOCUMENTACION,
                    titulo=f"{nombre}: {persona.nombre} {persona.apellido}"[:100],
                    mensaje=f"La {nombre.lower()} de {persona.nombre} {persona.apellido} {estado}."[:250],
                    enlace="/personal/vencimientos",
                    fecha_creacion=datetime.combine(hoy - timedelta(days=1), time(7)), leida=False)


def _cerrar(crear, incidente, responsable, momento, correccion):
    crear(AccionCorrectiva, {"incidente_id": incidente.id, "descripcion": correccion},
        responsable_id=responsable.id, fecha_cierre=momento, vigente=True)
    crear(MovimientoIncidente, {"incidente_id": incidente.id, "accion": AccionMovimientoIncidente.CERRADO},
        personal_id=responsable.id, fecha_hora=momento, motivo=correccion)


def cargar_incidentes(crear, personas, fotos, hoy):
    tipos = {}
    for nombre, color in TIPOS_INCIDENTE:
        tipo, _ = crear(TipoIncidente, {"nombre": nombre}, color=color, activo=True)
        tipos[nombre] = tipo
    nombre_inactivo, color_inactivo = TIPO_INCIDENTE_INACTIVO
    tipos[nombre_inactivo], _ = crear(TipoIncidente, {"nombre": nombre_inactivo}, color=color_inactivo, activo=False)
    calidad = personas["admin"]

    for descripcion, tipo, dias, hora, usuario, foto, correccion, reabierto in datos.INCIDENTES:
        reportante = personas[usuario]
        momento = datetime.combine(hoy - timedelta(days=dias), time(hora, 15))
        abierto = correccion is None or reabierto
        incidente, nuevo = crear(Incidente, {"descripcion": descripcion}, tipo_id=tipos[tipo].id,
            reportado_por_dni=reportante.dni, fecha_hora=momento,
            imagen_path=fotos[foto] if foto is not None else None,
            estado=EstadoIncidente.ABIERTO if abierto else EstadoIncidente.CERRADO)
        if not nuevo:
            continue
        crear(MovimientoIncidente, {"incidente_id": incidente.id, "accion": AccionMovimientoIncidente.REPORTADO},
            personal_id=reportante.id, fecha_hora=momento)
        if correccion:
            _cerrar(crear, incidente, calidad, momento + timedelta(hours=26), correccion)
        if reabierto:
            crear(MovimientoIncidente, {"incidente_id": incidente.id, "accion": AccionMovimientoIncidente.REABIERTO},
                personal_id=calidad.id, fecha_hora=momento + timedelta(days=3),
                motivo="El error de vencimiento se repitió en otro lote: se reabre para revisar la impresora.")

    for descripcion, dias, hora, usuario, correccion in datos.INCIDENTES_PROVEEDOR:
        reportante = personas[usuario]
        momento = datetime.combine(hoy - timedelta(days=dias), time(hora, 40))
        incidente, nuevo = crear(Incidente, {"descripcion": descripcion}, tipo_id=tipos[nombre_inactivo].id,
            reportado_por_dni=reportante.dni, fecha_hora=momento, imagen_path=None,
            estado=EstadoIncidente.CERRADO if correccion else EstadoIncidente.ABIERTO)
        if not nuevo:
            continue
        crear(MovimientoIncidente, {"incidente_id": incidente.id, "accion": AccionMovimientoIncidente.REPORTADO},
            personal_id=reportante.id, fecha_hora=momento)
        if correccion:
            _cerrar(crear, incidente, calidad, momento + timedelta(hours=4), correccion)


def cargar_documentos_tecnicos(crear, personas, hoy, archivos_dir):
    archivos_dir.mkdir(parents=True, exist_ok=True)
    autor = personas["admin"]
    for i, (nombre, tipo, descripcion, sector, versiones) in enumerate(datos.DOCUMENTOS_TECNICOS, start=1):
        creado = datetime.combine(hoy - timedelta(days=200 - i * 5), time(9))
        documento, nuevo = crear(DocumentoTecnico, {"nombre": nombre}, descripcion=descripcion,
            tipo=TipoDocumentoTecnico(tipo), estado=EstadoDocumento.VIGENTE, fecha_creacion=creado)
        if not nuevo:
            continue
        anterior = None
        for numero in range(1, versiones + 1):
            vigente = numero == versiones
            fecha = creado if numero == 1 else datetime.combine(hoy - timedelta(days=30), time(10))
            archivo = f"panificadora-documento-{i:02d}-v{numero}.pdf"
            contenido = _pdf_certificado(nombre, [
                f"{datos.EMPRESA} - Documento de demostracion",
                f"Sector: {datos.SECTORES[sector]}", f"Version {numero}",
                "Responsable: Laura Benitez (Calidad)",
                "Revisar y firmar la lectura antes de aplicar."])
            if not (archivos_dir / archivo).exists():
                (archivos_dir / archivo).write_bytes(contenido)
            version, _ = crear(VersionDocumentoTecnico, {"documento_id": documento.id, "numero": numero},
                estado=EstadoDocumento.VIGENTE if vigente else EstadoDocumento.ARCHIVADO,
                archivo_nombre=archivo, nombre_original=archivo, tipo_contenido="application/pdf",
                tamanio_bytes=len(contenido),
                comentario="Versión inicial" if numero == 1 else "Actualización por la auditoría bromatológica",
                fecha_subida=fecha, subido_por_id=autor.id)
            crear(CambioVigenciaDocumentoTecnico, {"documento_id": documento.id, "version_id": version.id},
                version_anterior_id=anterior.id if anterior else None, personal_id=autor.id, fecha_vigencia=fecha)
            anterior = version
