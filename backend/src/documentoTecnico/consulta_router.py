from urllib.parse import quote
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from src.auth.dependencies import tiene_permiso_operar
from src.database import get_db
from src.documentoTecnico import schemas, services
from src.documentoTecnico.models import EstadoDocumento, TipoDocumentoTecnico
from src.documentoTecnico.router import CARPETA_DOCUMENTOS
from src.pagination import PaginatedResponse

router = APIRouter(
    prefix="/documentos-vigentes", tags=["documentos_vigentes"],
    dependencies=[Depends(tiene_permiso_operar)],
)


@router.get("/", response_model=PaginatedResponse[schemas.DocumentoVigenteConsulta])
def listar_vigentes(
    db: Session = Depends(get_db), page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=100), buscar: str | None = Query(None, max_length=100),
    tipo: TipoDocumentoTecnico | None = None,
):
    resultado = services.listar_documentos(
        db, page=page, size=size, estado=EstadoDocumento.VIGENTE,
        tipo=tipo, busqueda=buscar, ordenar_por="nombre", orden="asc",
    )
    resultado["items"] = [
        schemas.DocumentoVigenteConsulta(
            id=doc.id, nombre=doc.nombre, tipo=doc.tipo,
            version_vigente=doc.version_vigente,
            fecha_vigencia=doc.vigencia_actual.fecha_vigencia if doc.vigencia_actual else None,
        ) for doc in resultado["items"]
    ]
    return resultado


@router.get("/{documento_id}/archivo")
def archivo_vigente(documento_id: int, db: Session = Depends(get_db)):
    documento = services.leer_documento(db, documento_id)
    if documento.estado != EstadoDocumento.VIGENTE:
        raise HTTPException(404, "El documento no está disponible para consulta.")
    version = documento.version_vigente
    if version is None:
        raise HTTPException(404, "Sin versión vigente disponible.")
    return _responder_archivo(version)


def _responder_archivo(version):
    ruta = CARPETA_DOCUMENTOS / version.archivo_nombre
    if not ruta.is_file():
        raise HTTPException(404, "El archivo de esta versión no está disponible.")
    return FileResponse(
        ruta, media_type=version.tipo_contenido, filename=version.nombre_original,
        headers={
            "X-Version-Id": str(version.id), "X-Version-Numero": str(version.numero),
            "X-Archivo-Nombre": quote(version.nombre_original, safe=""),
            "Cache-Control": "no-store", "X-Version-Estado": version.estado.value,
        },
    )


def _documento_consultable(db: Session, documento_id: int):
    documento = services.leer_documento(db, documento_id)
    if documento.estado != EstadoDocumento.VIGENTE:
        raise HTTPException(404, "El documento no está disponible para consulta.")
    return documento


@router.get("/{documento_id}/historial", response_model=list[schemas.VersionConsultaHistorial])
def consultar_historial(documento_id: int, db: Session = Depends(get_db)):
    return _documento_consultable(db, documento_id).versiones


@router.get("/{documento_id}/historial/{version_id}/archivo")
def archivo_historial(documento_id: int, version_id: int, db: Session = Depends(get_db)):
    documento = _documento_consultable(db, documento_id)
    version = next((v for v in documento.versiones if v.id == version_id), None)
    if version is None:
        raise HTTPException(404, "La versión no pertenece a este documento.")
    return _responder_archivo(version)
