import asyncio

from fastapi import APIRouter, Depends, Request, Response
from fastapi.responses import StreamingResponse
from starlette.concurrency import run_in_threadpool
from sqlalchemy.orm import Session

from src.auth.dependencies import tiene_permiso_administrar
from src.auth.router_base import PermissionedRouter
from src.database import SessionLocal, get_db
from src.personal.models import Personal
from src.vistaPublica import schemas, services

router = PermissionedRouter(prefix="/vista-publica", tags=["vista_publica"])

publico_router = APIRouter(prefix="/publico", tags=["vista_publica_visitante"])


@router.get(
    "/configuracion",
    response_model=schemas.ConfiguracionVistaPublicaResponse,
)
def read_configuracion_vista_publica(db: Session = Depends(get_db)):
    return services.leer_configuracion(db)


@router.post(
    "/activar",
    response_model=schemas.ConfiguracionVistaPublicaResponse,
)
def activar_vista_publica(
    db: Session = Depends(get_db),
    personal: Personal = Depends(tiene_permiso_administrar),
):
    return services.activar_vista_publica(db, personal)


@router.post(
    "/desactivar",
    response_model=schemas.ConfiguracionVistaPublicaResponse,
)
def desactivar_vista_publica(
    db: Session = Depends(get_db),
    personal: Personal = Depends(tiene_permiso_administrar),
):
    return services.desactivar_vista_publica(db, personal)


@publico_router.get(
    "/saia-publica",
    response_model=schemas.VistaPublicaResponse,
)
def read_vista_publica_visitante(
    response: Response,
    db: Session = Depends(get_db),
):
    response.headers["Cache-Control"] = "no-store"

    return services.consultar_vista_publica(db)

@router.patch(
    "/indicadores",
    response_model=schemas.ConfiguracionVistaPublicaResponse,
)
def actualizar_indicador(
    datos: schemas.IndicadorActualizar,
    response: Response,
    db: Session = Depends(get_db),
    personal: Personal = Depends(tiene_permiso_administrar),
):
    response.headers["Cache-Control"] = "no-store"

    return services.modificar_indicador(db, datos, personal)


@router.get(
    "/previsualizacion",
    response_model=schemas.VistaPublicaResponse,
)
def previsualizar(
    response: Response,
    db: Session = Depends(get_db),
):
    response.headers["Cache-Control"] = "no-store"

    return services.previsualizar_vista_publica(db)

def _leer_publicacion_json() -> str:
    # Cada consulta usa su propia sesión y solo realiza lecturas.
    with SessionLocal() as db:
        datos = services.consultar_vista_publica(db)
        return datos.model_dump_json()


@publico_router.get("/saia-publica/eventos")
async def observar_vista_publica(
    request: Request,
):
    # Valida el enlace antes de iniciar la conexión.
    inicial = await run_in_threadpool(
        _leer_publicacion_json,
    )

    async def eventos():
        anterior = inicial
        yield f"event: vista\ndata: {inicial}\n\n"

        while not await request.is_disconnected():
            await asyncio.sleep(1)

            if await request.is_disconnected():
                return

            try:
                actual = await run_in_threadpool(
                    _leer_publicacion_json,
                )
            except services.exceptions.VistaPublicaNoDisponible:
                yield (
                    "event: no-disponible\n"
                    'data: {"disponible":false}\n\n'
                )
                return

            if actual != anterior:
                anterior = actual
                yield f"event: vista\ndata: {actual}\n\n"
            else:
                yield ": mantener-conexion\n\n"

    return StreamingResponse(
        eventos(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-store",
            "X-Accel-Buffering": "no",
        },
    )
