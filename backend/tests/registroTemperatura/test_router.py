from datetime import date
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from src.main import app as registered_app
from src.database import get_db
from src.models import ModeloBase
from src.personal.models import Personal
from src.equipos.models import Equipo, TipoEquipo
from src.sector.models import Sector
from src.registroTemperatura.router import router as temperatura_router
from src.notificaciones.models import Notificacion, TipoNotificacion
from src.auth.utils import create_access_token

class Escenario:

    def setUp(self):
        self.engine = create_engine('sqlite://', connect_args={'check_same_thread': False}, poolclass=StaticPool)
        ModeloBase.metadata.create_all(self.engine)
        self.db = sessionmaker(bind=self.engine)()
        self.operario = Personal(nombre='operario', apellido='Test', dni='123', nroLegajo='123', email='op@test.com', username='operario', hashed_password='x', operar=True, administrar=False, activo=True)
        self.db.add(self.operario)
        self.sector = Sector(nombre='Cocina', activo=True)
        self.db.add(self.sector)
        self.db.flush()
        self.heladera = Equipo(numero_serie='H-01', nombre='Heladera Principal', tipo=TipoEquipo.EQUIPO, sector_id=self.sector.id, activo=True, controla_temperatura=True, temperatura_minima=2.0, temperatura_maxima=8.0)
        self.db.add(self.heladera)
        self.db.commit()
        app = FastAPI()
        app.include_router(temperatura_router)
        app.dependency_overrides[get_db] = lambda: self.db
        self.client = TestClient(app)
        self.headers = {'Authorization': 'Bearer ' + create_access_token(self.operario)}

    def tearDown(self):
        self.client.close()
        self.db.close()
        self.engine.dispose()
import pytest

@pytest.fixture
def escenario():
    caso = Escenario()
    caso.setUp()
    try:
        yield caso
    finally:
        caso.tearDown()

def test_lectura_parametrizada(escenario):
    self = escenario
    casos = [(5.0, None, 200, False), (10.0, 'Cambié el termostato', 200, True), (1.0, 'Puerta estaba abierta, la cerré', 200, True)]
    for temp, accion, status_esperado, fuera_esperado in casos:
        payload = {'equipo_id': self.heladera.id, 'temperatura_registrada': temp, 'accion_tomada': accion}
        respuesta = self.client.post('/registros-temperatura/', json=payload, headers=self.headers)
        assert respuesta.status_code == status_esperado, respuesta.text
        datos = respuesta.json()
        assert datos['temperatura_registrada'] == temp
        assert datos['fuera_de_rango'] == fuera_esperado

def test_lectura_fuera_de_rango_sin_accion_es_rechazada(escenario):
    self = escenario
    payload = {'equipo_id': self.heladera.id, 'temperatura_registrada': 15.0, 'accion_tomada': None}
    respuesta = self.client.post('/registros-temperatura/', json=payload, headers=self.headers)
    assert respuesta.status_code == 400
    assert 'Debés indicar la acción tomada' in respuesta.json()['detail']

def test_genera_notificacion_al_registrar_fuera_de_rango(escenario):
    self = escenario
    payload = {'equipo_id': self.heladera.id, 'temperatura_registrada': -5.0, 'accion_tomada': 'Llamé al técnico'}
    respuesta = self.client.post('/registros-temperatura/', json=payload, headers=self.headers)
    assert respuesta.status_code == 200
    notificacion = self.db.query(Notificacion).filter(Notificacion.tipo == TipoNotificacion.TEMPERATURA_FUERA_RANGO).first()
    assert notificacion is not None
    assert 'Heladera Principal' in notificacion.mensaje
    assert '-5.0' in notificacion.mensaje

def test_accion_en_blanco_no_justifica_temperatura_fuera_de_rango(escenario):
    self = escenario
    respuesta = self.client.post('/registros-temperatura/', json={'equipo_id': self.heladera.id, 'temperatura_registrada': 20, 'accion_tomada': '   '}, headers=self.headers)
    assert respuesta.status_code == 400

def test_limites_inclusivos_y_rechazo_no_finito(escenario):
    self = escenario
    for temperatura in (2.0, 8.0):
        respuesta = self.client.post('/registros-temperatura/', json={'equipo_id': self.heladera.id, 'temperatura_registrada': temperatura}, headers=self.headers)
        assert respuesta.status_code == 200
        assert not respuesta.json()['fuera_de_rango']
    for temperatura in ('NaN', 'Infinity', '-Infinity'):
        respuesta = self.client.post('/registros-temperatura/', json={'equipo_id': self.heladera.id, 'temperatura_registrada': temperatura}, headers=self.headers)
        assert respuesta.status_code == 422

def test_configuracion_invalida_no_causa_error_interno(escenario):
    self = escenario
    self.heladera.temperatura_maxima = None
    self.db.commit()
    respuesta = self.client.post('/registros-temperatura/', json={'equipo_id': self.heladera.id, 'temperatura_registrada': 5}, headers=self.headers)
    assert respuesta.status_code == 409


@pytest.mark.parametrize('ruta', ['/registros-temperatura/', '/registros-temperatura/pendientes-hoy'])
def test_consulta_requiere_permisos(client, headers_sin_permisos, ruta):
    assert client.get(ruta).status_code == 401
    assert client.get(ruta, headers=headers_sin_permisos).status_code == 403


def test_registro_historial_y_pendientes_por_http(client, equipo_frio, headers_operadora, admin_headers, persona_operadora):
    pendientes = client.get('/registros-temperatura/pendientes-hoy', headers=headers_operadora)
    assert pendientes.status_code == 200 and pendientes.json()[0]['id'] == equipo_frio.id
    datos = {'equipo_id':equipo_frio.id,'temperatura_registrada':10,'accion_tomada':'Ajustar termostato'}
    respuesta = client.post('/registros-temperatura/', json=datos, headers=headers_operadora)
    assert respuesta.status_code == 200
    assert respuesta.json()['operario_id'] == persona_operadora.id
    assert client.get('/registros-temperatura/pendientes-hoy', headers=headers_operadora).json() == []
    listado = client.get('/registros-temperatura/', params={'equipo_id':equipo_frio.id,'solo_alertas':True,'fecha_desde':date.today().isoformat(),'fecha_hasta':date.today().isoformat()}, headers=admin_headers)
    assert listado.status_code == 200 and listado.json()['total'] == 1
    assert client.get('/registros-temperatura/', params={'fecha_desde':'invalida'}, headers=admin_headers).status_code == 422


def test_registro_no_admite_usuario_sin_operar(client, equipo_frio, headers_sin_permisos):
    datos = {'equipo_id':equipo_frio.id,'temperatura_registrada':5}
    assert client.post('/registros-temperatura/', json=datos).status_code == 401
    assert client.post('/registros-temperatura/', json=datos, headers=headers_sin_permisos).status_code == 403
