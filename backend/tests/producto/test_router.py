from datetime import date, timedelta
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from src.main import app as registered_app
from src.auth.utils import create_access_token
from src.database import get_db
from src.loteProduccion.router import router as lote_router
from src.models import ModeloBase
from src.personal.models import Personal
from src.producto.router import router as producto_router
from src.unidadMedida.models import TipoUnidadMedida, UnidadMedida
from src.unidadMedida.router import router as unidad_router

class Escenario:

    def setUp(self):
        self.engine = create_engine('sqlite://', connect_args={'check_same_thread': False}, poolclass=StaticPool)
        ModeloBase.metadata.create_all(self.engine)
        self.db = sessionmaker(bind=self.engine)()
        self.admin = self.persona('admin', operar=True, administrar=True)
        self.operario = self.persona('opera', operar=True, administrar=False)
        self.otro_operario = self.persona('opera2', operar=True, administrar=False)
        self.sin_permisos = self.persona('nadie', operar=False, administrar=False)
        self.kg = UnidadMedida(tipo=TipoUnidadMedida.PESO, sufijo='kg', activo=True)
        self.un = UnidadMedida(tipo=TipoUnidadMedida.UNIDAD, sufijo='un', activo=True)
        self.db.add_all([self.kg, self.un])
        self.db.commit()
        app = FastAPI()
        for router in (producto_router, lote_router, unidad_router):
            app.include_router(router)
        app.dependency_overrides[get_db] = lambda: self.db
        self.client = TestClient(app)

    def tearDown(self):
        self.client.close()
        self.db.close()
        self.engine.dispose()

    def persona(self, nombre, operar, administrar):
        persona = Personal(nombre=nombre, apellido='Test', dni=nombre, nroLegajo=nombre, email=f'{nombre}@example.com', username=nombre, hashed_password='unused', operar=operar, administrar=administrar, activo=True)
        self.db.add(persona)
        self.db.commit()
        return persona

    def headers(self, persona):
        return {'Authorization': 'Bearer ' + create_access_token(persona)}

    def crear_producto(self, nombre='Pan francés', persona=None, **extra):
        datos = {'nombre': nombre, 'unidad_medida_id': self.kg.id, **extra}
        return self.client.post('/productos/', json=datos, headers=self.headers(persona or self.admin))

    def crear_lote(self, producto_id, persona=None, **extra):
        datos = {'producto_id': producto_id, 'fecha_produccion': date.today().isoformat(), 'cantidad': 12.5, **extra}
        return self.client.post('/lotes-produccion/', json=datos, headers=self.headers(persona or self.operario))
import pytest

@pytest.fixture
def escenario():
    caso = Escenario()
    caso.setUp()
    try:
        yield caso
    finally:
        caso.tearDown()

def test_crear_producto(escenario):
    self = escenario
    respuesta = self.crear_producto(descripcion='  Pan del día  ')
    assert respuesta.status_code == 200, respuesta.text
    producto = respuesta.json()
    assert producto['descripcion'] == 'Pan del día'
    assert producto['unidad_medida']['sufijo'] == 'kg'
    assert producto['activo']

def test_producto_nombre_duplicado_y_vacio(escenario):
    self = escenario
    self.crear_producto('Pan francés')
    assert self.crear_producto('pan FRANCÉS').status_code == 400
    assert self.crear_producto('   ').status_code == 422

def test_producto_con_unidad_inexistente(escenario):
    self = escenario
    respuesta = self.client.post('/productos/', json={'nombre': 'X', 'unidad_medida_id': 999}, headers=self.headers(self.admin))
    assert respuesta.status_code == 404

def test_operario_crea_producto_y_consulta_activos(escenario):
    self = escenario
    assert self.crear_producto('Facturas', persona=self.operario).status_code == 200
    activos = self.client.get('/productos/activos', headers=self.headers(self.operario))
    assert [p['nombre'] for p in activos.json()] == ['Facturas']
    unidades = self.client.get('/unidades-medida/activas', headers=self.headers(self.operario))
    assert unidades.status_code == 200
    assert {u['sufijo'] for u in unidades.json()} == {'kg', 'un'}

def test_operario_no_administra_productos(escenario):
    self = escenario
    producto_id = self.crear_producto().json()['id']
    operario = self.headers(self.operario)
    assert self.client.get('/productos/', headers=operario).status_code == 403
    assert self.client.put(f'/productos/{producto_id}', json={'nombre': 'Otro'}, headers=operario).status_code == 403
    assert self.client.delete(f'/productos/{producto_id}', headers=operario).status_code == 403
    assert self.crear_producto('X', persona=self.sin_permisos).status_code == 403

def test_baja_y_reactivacion_de_producto(escenario):
    self = escenario
    producto_id = self.crear_producto().json()['id']
    admin = self.headers(self.admin)
    assert not self.client.delete(f'/productos/{producto_id}', headers=admin).json()['activo']
    assert self.client.get('/productos/', headers=admin).json()['total'] == 0
    assert self.client.get('/productos/?mostrar_inactivos=true', headers=admin).json()['total'] == 1
    reactivado = self.client.put(f'/productos/{producto_id}', json={'activo': True}, headers=admin)
    assert reactivado.json()['activo']

def test_listado_de_productos_con_busqueda_y_orden(escenario):
    self = escenario
    for nombre in ('Prepizza', 'Budín', 'Alfajores'):
        self.crear_producto(nombre)
    admin = self.headers(self.admin)
    datos = self.client.get('/productos/?ordenar_por=nombre&orden=asc', headers=admin).json()
    assert [p['nombre'] for p in datos['items']] == ['Alfajores', 'Budín', 'Prepizza']
    assert self.client.get('/productos/?buscar=piz', headers=admin).json()['total'] == 1
