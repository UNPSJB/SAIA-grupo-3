from sqlalchemy.orm import Session

from src.vistaPublica import schemas
from src.vistaPublica.models import ConfiguracionVistaPublica


def obtener_codigos_habilitados(config: ConfiguracionVistaPublica) -> set[str]:
    if not config.indicadores_habilitados:
        return set()
    return {
        codigo.strip()
        for codigo in config.indicadores_habilitados.split(",")
        if codigo.strip()
    }


def calcular_indicadores_publicos(
    db: Session,
    config: ConfiguracionVistaPublica,
) -> list[schemas.IndicadorPublico]:

    habilitados = obtener_codigos_habilitados(config)
    indicadores: list[schemas.IndicadorPublico] = []

    # TODO: hacer los calculos correspondientes a cada indicador

    return indicadores