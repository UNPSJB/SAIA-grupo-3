import pytest
from fastapi import HTTPException
from sqlalchemy import select
from pydantic import ValidationError
from src.vistaPublica import services, schemas
from src.vistaPublica.models import ConfiguracionVistaPublica
from src.vistaPublica.indicadores import CODIGOS_PUBLICABLES


def test_inicialmente_desactivada_y_consulta_no_crea_configuracion(db_session):
    with pytest.raises(HTTPException) as error:
        services.consultar_vista_publica(db_session)
    assert error.value.status_code == 404
    assert db_session.scalar(select(ConfiguracionVistaPublica)) is None
    config = services.leer_configuracion(db_session)
    assert config.activa is False and config.enlace is None and config.token is None


def test_activar_desactivar_y_registrar_autor(db_session, persona_administradora):
    activa = services.activar_vista_publica(db_session, persona_administradora)
    assert activa.activa and activa.enlace and activa.token
    assert services.activar_vista_publica(db_session, persona_administradora).token == activa.token
    assert db_session.scalar(select(ConfiguracionVistaPublica)).actualizado_por_id == persona_administradora.id
    baja = services.desactivar_vista_publica(db_session, persona_administradora)
    assert not baja.activa and baja.token is None
    with pytest.raises(HTTPException):
        services.consultar_vista_publica(db_session)
    nueva = services.activar_vista_publica(db_session, persona_administradora)
    assert nueva.token != activa.token


@pytest.mark.parametrize('codigo', CODIGOS_PUBLICABLES)
def test_indicadores_independientes_y_cambio_inmediato(db_session, persona_administradora, codigo):
    services.activar_vista_publica(db_session, persona_administradora)
    for actual in CODIGOS_PUBLICABLES:
        services.modificar_indicador(db_session, schemas.IndicadorActualizar(codigo=actual, habilitado=False), persona_administradora)
    config = services.modificar_indicador(db_session, schemas.IndicadorActualizar(codigo=codigo, habilitado=True), persona_administradora)
    assert config.indicadores_habilitados == [codigo]
    assert [i.codigo for i in services.consultar_vista_publica(db_session).indicadores] == [codigo]
    services.modificar_indicador(db_session, schemas.IndicadorActualizar(codigo=codigo, habilitado=False), persona_administradora)
    assert services.consultar_vista_publica(db_session).indicadores == []


@pytest.mark.parametrize('codigo', ['incidentes', 'personal', 'password'])
def test_no_se_puede_publicar_indicador_sensible(codigo):
    with pytest.raises(ValidationError):
        schemas.IndicadorActualizar(codigo=codigo, habilitado=True)


def test_previsualizacion_no_publica(db_session):
    assert services.previsualizar_vista_publica(db_session).indicadores == []
    assert db_session.scalar(select(ConfiguracionVistaPublica)) is None


def test_indicadores_publicos_se_calculan_desde_registros_reales(db_session,persona_administradora,producto):
    from datetime import datetime,timedelta
    from src.loteProduccion.models import LoteProduccion
    from src.loteProduccion.constants import EstadoLote
    ayer=datetime.now()-timedelta(days=1)
    db_session.add(LoteProduccion(codigo='PUBLICO-REAL',producto_id=producto.id,fecha_produccion=ayer.date(),cantidad=12,registrado_por_id=persona_administradora.id,estado=EstadoLote.CERRADO,fecha_cierre=ayer,activo=True))
    db_session.commit()
    services.activar_vista_publica(db_session,persona_administradora)
    services.modificar_indicador(db_session,schemas.IndicadorActualizar(codigo='lotes_producidos',habilitado=True),persona_administradora)
    indicadores={i.codigo:i for i in services.consultar_vista_publica(db_session).indicadores}
    assert indicadores['lotes_producidos'].valor=='1'
