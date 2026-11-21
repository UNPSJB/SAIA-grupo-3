import pytest

from src.documentoTecnico import consulta_router, router as doc_router
from src.documentoTecnico import schemas, services
from src.documentoTecnico.models import TipoDocumentoTecnico


@pytest.fixture
def carpeta_documentos_tmp(tmp_path, monkeypatch):
    """Aísla en disco los archivos subidos tanto para administración como para consulta."""
    monkeypatch.setattr(doc_router, "CARPETA_DOCUMENTOS", tmp_path)
    monkeypatch.setattr(consulta_router, "CARPETA_DOCUMENTOS", tmp_path)
    return tmp_path


@pytest.fixture
def datos_archivo_pdf():
    def armar(nombre="manual.pdf", contenido=b"%PDF-1.4\n%%EOF"):
        return {
            "archivo_nombre": f"guardado-{nombre}",
            "nombre_original": nombre,
            "tipo_contenido": "application/pdf",
            "tamanio_bytes": len(contenido),
        }

    return armar


@pytest.fixture
def documento_bpm(db_session, persona_administradora, datos_archivo_pdf):
    return services.crear_documento(
        db_session,
        schemas.DocumentoTecnicoBase(
            nombre="Manual BPM",
            tipo=TipoDocumentoTecnico.MANUAL_BPM,
            descripcion="Buenas prácticas de manufactura",
        ),
        datos_archivo_pdf("manual_v1.pdf"),
        persona_administradora,
    )