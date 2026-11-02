from datetime import date, datetime, timedelta
import pytest
from fastapi import HTTPException
from sqlalchemy import select, func
from src.registroTemperatura import services, schemas
from src.registroTemperatura.models import RegistroTemperatura
from src.notificaciones.models import Notificacion


@pytest.mark.parametrize('valor,accion,alerta', [(2,None,False),(8,None,False),(5,None,False),(1,'Cerrar puerta',True),(10,'Revisar termostato',True)])
def test_lectura_rango_autor_y_notificacion(db_session, equipo_frio, persona_operadora, valor, accion, alerta):
    antes = datetime.now()
    registro = services.registrar_temperatura(db_session, schemas.RegistroTemperaturaCreate(equipo_id=equipo_frio.id, temperatura_registrada=valor, accion_tomada=accion), persona_operadora)
    assert registro.fuera_de_rango is alerta
    assert registro.operario_id == persona_operadora.id
    assert antes <= registro.fecha_hora_registro <= datetime.now()
    assert db_session.scalar(select(func.count()).select_from(Notificacion)) == int(alerta)


def test_rechazo_sin_accion_no_guarda_registro(db_session, equipo_frio, persona_operadora):
    with pytest.raises(HTTPException):
        services.registrar_temperatura(db_session, schemas.RegistroTemperaturaCreate(equipo_id=equipo_frio.id, temperatura_registrada=20), persona_operadora)
    assert db_session.scalar(select(func.count()).select_from(RegistroTemperatura)) == 0
    assert db_session.scalar(select(func.count()).select_from(Notificacion)) == 0


@pytest.mark.parametrize('situacion', ['inexistente','inactivo','sin_control'])
def test_equipo_no_elegible(db_session, equipo_frio, persona_operadora, situacion):
    if situacion == 'inactivo': equipo_frio.activo = False
    if situacion == 'sin_control': equipo_frio.controla_temperatura = False
    db_session.commit()
    with pytest.raises(HTTPException):
        services.registrar_temperatura(db_session, schemas.RegistroTemperaturaCreate(equipo_id=999999 if situacion=='inexistente' else equipo_frio.id, temperatura_registrada=5), persona_operadora)


def test_historial_fechas_alertas_y_pendientes(db_session, equipo_frio, persona_operadora):
    assert [e.id for e in services.equipos_pendientes_hoy(db_session)] == [equipo_frio.id]
    normal = services.registrar_temperatura(db_session, schemas.RegistroTemperaturaCreate(equipo_id=equipo_frio.id, temperatura_registrada=5), persona_operadora)
    normal.fecha_hora_registro = datetime.now()-timedelta(days=2)
    db_session.commit()
    assert len(services.equipos_pendientes_hoy(db_session)) == 1
    alerta = services.registrar_temperatura(db_session, schemas.RegistroTemperaturaCreate(equipo_id=equipo_frio.id, temperatura_registrada=10, accion_tomada='Revisar equipo'), persona_operadora)
    assert services.equipos_pendientes_hoy(db_session) == []
    resultado = services.listar_registros(db_session, equipo_id=equipo_frio.id, fecha_desde=date.today(), fecha_hasta=date.today(), solo_alertas=True)
    assert resultado['total'] == 1 and resultado['items'][0].id == alerta.id
    assert services.listar_registros(db_session, equipo_id=999999)['total'] == 0
