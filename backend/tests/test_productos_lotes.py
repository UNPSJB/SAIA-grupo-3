import unittest
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


class ProductosLotesTest(unittest.TestCase):
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
        persona = Personal(nombre=nombre, apellido='Test', dni=nombre, nroLegajo=nombre, email=f'{nombre}@example.com',
                           username=nombre, hashed_password='unused', operar=operar, administrar=administrar, activo=True)
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

    def test_crear_producto(self):
        respuesta = self.crear_producto(descripcion='  Pan del día  ')
        self.assertEqual(respuesta.status_code, 200, respuesta.text)
        producto = respuesta.json()
        self.assertEqual(producto['descripcion'], 'Pan del día')
        self.assertEqual(producto['unidad_medida']['sufijo'], 'kg')
        self.assertTrue(producto['activo'])

    def test_producto_nombre_duplicado_y_vacio(self):
        self.crear_producto('Pan francés')
        self.assertEqual(self.crear_producto('pan FRANCÉS').status_code, 400)
        self.assertEqual(self.crear_producto('   ').status_code, 422)

    def test_producto_con_unidad_inexistente(self):
        respuesta = self.client.post('/productos/', json={'nombre': 'X', 'unidad_medida_id': 999}, headers=self.headers(self.admin))
        self.assertEqual(respuesta.status_code, 404)

    def test_operario_crea_producto_y_consulta_activos(self):
        self.assertEqual(self.crear_producto('Facturas', persona=self.operario).status_code, 200)
        activos = self.client.get('/productos/activos', headers=self.headers(self.operario))
        self.assertEqual([p['nombre'] for p in activos.json()], ['Facturas'])
        unidades = self.client.get('/unidades-medida/activas', headers=self.headers(self.operario))
        self.assertEqual(unidades.status_code, 200)
        self.assertEqual({u['sufijo'] for u in unidades.json()}, {'kg', 'un'})

    def test_operario_no_administra_productos(self):
        producto_id = self.crear_producto().json()['id']
        operario = self.headers(self.operario)
        self.assertEqual(self.client.get('/productos/', headers=operario).status_code, 403)
        self.assertEqual(self.client.put(f'/productos/{producto_id}', json={'nombre': 'Otro'}, headers=operario).status_code, 403)
        self.assertEqual(self.client.delete(f'/productos/{producto_id}', headers=operario).status_code, 403)
        self.assertEqual(self.crear_producto('X', persona=self.sin_permisos).status_code, 403)

    def test_baja_y_reactivacion_de_producto(self):
        producto_id = self.crear_producto().json()['id']
        admin = self.headers(self.admin)
        self.assertFalse(self.client.delete(f'/productos/{producto_id}', headers=admin).json()['activo'])
        self.assertEqual(self.client.get('/productos/', headers=admin).json()['total'], 0)
        self.assertEqual(self.client.get('/productos/?mostrar_inactivos=true', headers=admin).json()['total'], 1)
        reactivado = self.client.put(f'/productos/{producto_id}', json={'activo': True}, headers=admin)
        self.assertTrue(reactivado.json()['activo'])

    def test_listado_de_productos_con_busqueda_y_orden(self):
        for nombre in ('Prepizza', 'Budín', 'Alfajores'):
            self.crear_producto(nombre)
        admin = self.headers(self.admin)
        datos = self.client.get('/productos/?ordenar_por=nombre&orden=asc', headers=admin).json()
        self.assertEqual([p['nombre'] for p in datos['items']], ['Alfajores', 'Budín', 'Prepizza'])
        self.assertEqual(self.client.get('/productos/?buscar=piz', headers=admin).json()['total'], 1)

    def test_registrar_lote(self):
        producto_id = self.crear_producto().json()['id']
        respuesta = self.crear_lote(producto_id, observaciones='Primera horneada')
        self.assertEqual(respuesta.status_code, 200, respuesta.text)
        lote = respuesta.json()
        self.assertEqual(lote['registrado_por']['id'], self.operario.id)
        self.assertEqual(lote['producto']['nombre'], 'Pan francés')
        self.assertEqual(lote['codigo'], f"L-{date.today():%Y%m%d}-001")
        self.assertEqual(self.crear_lote(producto_id).json()['codigo'], f"L-{date.today():%Y%m%d}-002")

    def test_lote_validaciones(self):
        producto_id = self.crear_producto().json()['id']
        manana = (date.today() + timedelta(days=1)).isoformat()
        self.assertEqual(self.crear_lote(producto_id, fecha_produccion=manana).status_code, 400)
        self.assertEqual(self.crear_lote(producto_id, cantidad=0).status_code, 422)
        self.assertEqual(self.crear_lote(999).status_code, 404)
        self.client.delete(f'/productos/{producto_id}', headers=self.headers(self.admin))
        self.assertEqual(self.crear_lote(producto_id).status_code, 400)

    def test_solo_quien_opera_registra_lotes(self):
        producto_id = self.crear_producto().json()['id']
        self.assertEqual(self.crear_lote(producto_id, persona=self.sin_permisos).status_code, 403)
        self.assertEqual(self.client.post('/lotes-produccion/', json={}).status_code, 401)

    def test_operario_ve_solo_sus_lotes(self):
        producto_id = self.crear_producto().json()['id']
        propio = self.crear_lote(producto_id).json()
        ajeno = self.crear_lote(producto_id, persona=self.otro_operario).json()
        operario = self.headers(self.operario)
        listado = self.client.get('/lotes-produccion/', headers=operario).json()
        self.assertEqual([l['id'] for l in listado['items']], [propio['id']])
        self.assertEqual(self.client.get(f"/lotes-produccion/{propio['id']}", headers=operario).status_code, 200)
        self.assertEqual(self.client.get(f"/lotes-produccion/{ajeno['id']}", headers=operario).status_code, 403)
        self.assertEqual(self.client.get('/lotes-produccion/', headers=self.headers(self.admin)).json()['total'], 2)

    def test_filtros_del_listado_de_lotes(self):
        pan = self.crear_producto('Pan').json()['id']
        budin = self.crear_producto('Budín').json()['id']
        hace_10 = (date.today() - timedelta(days=10)).isoformat()
        self.crear_lote(pan, fecha_produccion=hace_10)
        self.crear_lote(budin)
        admin = self.headers(self.admin)
        self.assertEqual(self.client.get(f'/lotes-produccion/?producto_id={budin}', headers=admin).json()['total'], 1)
        desde = (date.today() - timedelta(days=2)).isoformat()
        self.assertEqual(self.client.get(f'/lotes-produccion/?fecha_desde={desde}', headers=admin).json()['total'], 1)
        self.assertEqual(self.client.get('/lotes-produccion/?buscar=bud', headers=admin).json()['total'], 1)
        invertido = self.client.get(f'/lotes-produccion/?fecha_desde={date.today()}&fecha_hasta={hace_10}', headers=admin)
        self.assertEqual(invertido.status_code, 400)

    def test_admin_modifica_y_da_de_baja_un_lote(self):
        producto_id = self.crear_producto().json()['id']
        lote_id = self.crear_lote(producto_id).json()['id']
        admin = self.headers(self.admin)
        modificado = self.client.put(f'/lotes-produccion/{lote_id}', json={'cantidad': 30}, headers=admin)
        self.assertEqual(modificado.json()['cantidad'], 30)
        self.assertEqual(self.client.put(f'/lotes-produccion/{lote_id}', json={'cantidad': 1}, headers=self.headers(self.operario)).status_code, 403)
        self.assertFalse(self.client.delete(f'/lotes-produccion/{lote_id}', headers=admin).json()['activo'])
        self.assertEqual(self.client.get('/lotes-produccion/', headers=admin).json()['total'], 0)


if __name__ == '__main__':
    unittest.main()
