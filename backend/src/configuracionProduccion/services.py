from datetime import datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from src.configuracionProduccion import schemas
from src.configuracionProduccion.models import ConfiguracionProduccion
from src.personal.models import Personal


def obtener_configuracion(db: Session) -> ConfiguracionProduccion:
    configuracion = db.scalar(select(ConfiguracionProduccion).order_by(ConfiguracionProduccion.id).limit(1))
    if configuracion is None:
        configuracion = ConfiguracionProduccion()
        db.add(configuracion)
        db.flush()
    return configuracion


def actualizar_configuracion(db: Session, datos: schemas.ConfiguracionUpdate, persona: Personal) -> ConfiguracionProduccion:
    configuracion = obtener_configuracion(db)
    configuracion.formato_aditivos = datos.formato_aditivos
    configuracion.actualizado_por_id = persona.id
    configuracion.actualizado_en = datetime.now()
    db.commit()
    db.refresh(configuracion)
    return configuracion
