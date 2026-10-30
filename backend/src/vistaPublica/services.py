from datetime import datetime
import secrets
from fastapi import HTTPException
from sqlalchemy import select, update
from sqlalchemy.orm import Session

from src.personal.models import Personal
from src.vistaPublica import exceptions, schemas
from src.vistaPublica.indicadores import (
    CODIGOS_PUBLICABLES,
    calcular_indicadores_publicos,
    obtener_codigos_habilitados,
)
from src.vistaPublica.models import ConfiguracionVistaPublica


def _armar_respuesta_config(
    config: ConfiguracionVistaPublica,
) -> schemas.ConfiguracionVistaPublicaResponse:
    enlace = "/saia-publica" if config.activa else None

    return schemas.ConfiguracionVistaPublicaResponse(
        activa=config.activa,
        token=config.token if config.activa else None,
        enlace=enlace,
        fecha_actualizacion=config.fecha_actualizacion,
        indicadores_habilitados=sorted(
            obtener_codigos_habilitados(config)
        ),
    )


def obtener_o_crear_configuracion(db: Session) -> ConfiguracionVistaPublica:
    config = db.scalar(
        select(ConfiguracionVistaPublica).order_by(ConfiguracionVistaPublica.id)
    )
    if config is None:
        config = ConfiguracionVistaPublica(
            activa=False,
            token=None,
            fecha_actualizacion=datetime.now(),
        )
        db.add(config)
        db.commit()
        db.refresh(config)
    return config


def leer_configuracion(db: Session) -> schemas.ConfiguracionVistaPublicaResponse:
    config = obtener_o_crear_configuracion(db)
    return _armar_respuesta_config(config)


def activar_vista_publica(
    db: Session, personal: Personal
) -> schemas.ConfiguracionVistaPublicaResponse:
    config = obtener_o_crear_configuracion(db)
    if not config.activa or not config.token:
        config.token = secrets.token_urlsafe(24)
    config.activa = True
    config.fecha_actualizacion = datetime.now()
    config.actualizado_por_id = personal.id
    db.commit()
    db.refresh(config)
    return _armar_respuesta_config(config)


def desactivar_vista_publica(
    db: Session, personal: Personal
) -> schemas.ConfiguracionVistaPublicaResponse:
    config = obtener_o_crear_configuracion(db)
    config.activa = False
    config.token = None
    config.fecha_actualizacion = datetime.now()
    config.actualizado_por_id = personal.id
    db.commit()
    db.refresh(config)
    return _armar_respuesta_config(config)


def consultar_vista_publica(
    db: Session,
) -> schemas.VistaPublicaResponse:
    # La consulta pública busca una configuración existente.
    # Nunca debe llamar a obtener_o_crear_configuracion.
    config = db.scalar(
        select(ConfiguracionVistaPublica)
        .order_by(ConfiguracionVistaPublica.id)
        .limit(1)
    )

    if config is None or not config.activa:
        raise exceptions.VistaPublicaNoDisponible()

    return schemas.VistaPublicaResponse(
        fecha_actualizacion=config.fecha_actualizacion,
        indicadores=calcular_indicadores_publicos(db, config),
    )

def modificar_indicador(
    db: Session,
    datos: schemas.IndicadorActualizar,
    personal: Personal,
) -> schemas.ConfiguracionVistaPublicaResponse:
    config = obtener_o_crear_configuracion(db)

    valor_anterior = config.indicadores_habilitados
    habilitados = obtener_codigos_habilitados(config)

    if datos.habilitado:
        habilitados.add(datos.codigo)
    else:
        habilitados.discard(datos.codigo)

    valor_nuevo = ",".join(
        codigo
        for codigo in CODIGOS_PUBLICABLES
        if codigo in habilitados
    )

    # Evita sobrescribir silenciosamente una selección que otro
    # administrador haya cambiado mientras se procesaba la petición.
    resultado = db.execute(
        update(ConfiguracionVistaPublica)
        .where(
            ConfiguracionVistaPublica.id == config.id,
            ConfiguracionVistaPublica.indicadores_habilitados
            == valor_anterior,
        )
        .values(
            indicadores_habilitados=valor_nuevo,
            fecha_actualizacion=datetime.now(),
            actualizado_por_id=personal.id,
        )
        .execution_options(synchronize_session=False)
    )

    if resultado.rowcount != 1:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail=(
                "Otro administrador modificó la selección. "
                "Actualizá la configuración y volvé a intentarlo."
            ),
        )

    db.commit()
    db.refresh(config)

    return _armar_respuesta_config(config)


def previsualizar_vista_publica(
    db: Session,
) -> schemas.VistaPublicaResponse:
    config = db.scalar(
        select(ConfiguracionVistaPublica)
        .order_by(ConfiguracionVistaPublica.id)
        .limit(1)
    )

    if config is None:
        return schemas.VistaPublicaResponse(
            fecha_actualizacion=datetime.now(),
            indicadores=[],
        )

    # Permite previsualizar sin activar la publicación.
    # No modifica la configuración ni los datos operativos.
    return schemas.VistaPublicaResponse(
        fecha_actualizacion=config.fecha_actualizacion,
        indicadores=calcular_indicadores_publicos(db, config),
    )
