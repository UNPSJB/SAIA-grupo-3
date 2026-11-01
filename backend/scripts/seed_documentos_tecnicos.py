"""Documentos técnicos y versiones PDF de demostración."""

from datetime import datetime, time

from scripts.seed_common import _pdf_certificado
from scripts.seed_equipos import EQUIPOS
from scripts.seed_sectores import SECTORES
from src.documentoTecnico.models import (
    CambioVigenciaDocumentoTecnico,
    DocumentoTecnico,
    EstadoDocumento,
    TipoDocumentoTecnico,
    VersionDocumentoTecnico,
)


DOCUMENTOS_TECNICOS = ["Manual de buenas prácticas de manufactura", "POES de recepción de materias primas",
    "Control de temperatura de cámaras", "Procedimiento de descongelación segura", "Lavado de vegetales",
    "Prevención de contaminación cruzada", "Limpieza de horno convector", "Higiene de amasadoras",
    "Control de alérgenos en pastelería", "Trazabilidad del envasado", "Control de despacho de alimentos",
    "Desinfección de vajilla", "Ficha técnica de detergente neutro", "Higiene de manos del personal",
    "Receta de demostración para preparación de vegetales"]

def cargar_documentos_tecnicos(crear, admin, ayer, archivos_dir):
    carpeta = archivos_dir
    carpeta.mkdir(parents=True, exist_ok=True)
    for i, nombre in enumerate(DOCUMENTOS_TECNICOS):
        tipo = TipoDocumentoTecnico.MANUAL_BPM if i == 0 else TipoDocumentoTecnico.FICHA_TECNICA if i == 12 else TipoDocumentoTecnico.RECETA if i == 14 else TipoDocumentoTecnico.PROCEDIMIENTO
        documento, _ = crear(DocumentoTecnico, {"nombre": nombre}, descripcion=f"Documento de demostración para {SECTORES[i].lower()}.",
            tipo=tipo, estado=EstadoDocumento.VIGENTE, fecha_creacion=datetime.combine(ayer, time(8, i)))
        nombre_archivo = f"seed-saia-documento-{i + 1:02d}.pdf"
        contenido = _pdf_certificado(nombre, ["DOCUMENTO DE DEMOSTRACION - SIN VALIDEZ OFICIAL",
            f"Sector: {SECTORES[i]}", f"Equipo: {EQUIPOS[i]}", "Verificar higiene antes y despues de la operacion.",
            "Registrar responsable, fecha y resultados del control.", "Aplicar la ficha del producto; no mezclar quimicos."])
        if not (carpeta / nombre_archivo).exists():
            (carpeta / nombre_archivo).write_bytes(contenido)
        version, nueva = crear(VersionDocumentoTecnico, {"documento_id": documento.id, "numero": 1},
            estado=EstadoDocumento.VIGENTE, archivo_nombre=nombre_archivo, nombre_original=nombre_archivo,
            tipo_contenido="application/pdf", tamanio_bytes=len(contenido), comentario="Versión de prueba del seed",
            fecha_subida=datetime.combine(ayer, time(8, i)), subido_por_id=admin.id)
        if nueva:
            crear(CambioVigenciaDocumentoTecnico, {"documento_id": documento.id, "version_id": version.id},
                version_anterior_id=None, personal_id=admin.id, fecha_vigencia=datetime.combine(ayer, time(8, i)))
