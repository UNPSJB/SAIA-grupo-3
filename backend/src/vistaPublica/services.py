from datetime import datetime
import secrets
from sqlalchemy import select
from sqlalchemy.orm import Session

from src.personal.models import Personal
from src.vistaPublica import exceptions, schemas
from src.vistaPublica.indicadores import calcular_indicadores_publicos
from src.vistaPublica.models import ConfiguracionVistaPublica


def _armar_respuesta_config(
    config: ConfiguracionVistaPublica,
) -> schemas.ConfiguracionVistaPublicaResponse:
    enlace = f"/publico/{config.token}" if (config.activa and config.token) else None
    return schemas.ConfiguracionVistaPublicaResponse(
        activa=config.activa,
        token=config.token if config.activa else None,
        enlace=enlace,
        fecha_actualizacion=config.fecha_actualizacion,
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
    db: Session, token: str
) -> schemas.VistaPublicaResponse:
    config = obtener_o_crear_configuracion(db)
    if (
        not config.activa
        or not config.token
        or not token
        or not secrets.compare_digest(config.token, token)
    ):
        raise exceptions.VistaPublicaNoDisponible()

    indicadores = calcular_indicadores_publicos(db, config)
    return schemas.VistaPublicaResponse(
        fecha_actualizacion=config.fecha_actualizacion,
        indicadores=indicadores,
    )