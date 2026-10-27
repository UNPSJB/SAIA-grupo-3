import unittest
from datetime import date, datetime, time, timedelta

from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from src.main import app as registered_app  # noqa: F401 - registra todos los modelos
from src.accionCorrectiva.models import AccionCorrectiva
from src.auth.utils import create_access_token
from src.database import get_db
from src.incidente.constants import EstadoIncidente
from src.incidente.models import Incidente
from src.incidente.router import router
from src.models import ModeloBase
from src.personal.models import Personal
from src.tipoIncidente.models import TipoIncidente


class EstadisticasIncidentesTest(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine('sqlite://', connect_args={'check_same_thread': False}, poolclass=StaticPool)
        ModeloBase.metadata.create_all(self.engine)
        self.db = sessionmaker(bind=self.engine)()
        self.admin = self.persona('admin', administrar=True)
        self.operario = self.persona('opera', administrar=False)
        self.plagas = TipoIncidente(nombre='Plagas', color='danger', activo=True)
        self.higiene = TipoIncidente(nombre='Higiene', color='info', activo=True)
        self.sin_uso = TipoIncidente(nombre='Sin uso', color='secondary', activo=True)
        self.de_baja = TipoIncidente(nombre='De baja', color='dark', activo=False)
        self.de_baja_vacio = TipoIncidente(nombre='De baja vacío', color='dark', activo=False)
        self.db.add_all([self.plagas, self.higiene, self.sin_uso, self.de_baja, self.de_baja_vacio])
        self.db.commit()

        self.hoy = date.today()
        # Dentro de los últimos 30 días
        self.incidente(self.plagas, dias_atras=1, cerrado_en_horas=2)
        self.incidente(self.plagas, dias_atras=3)
        self.incidente(self.higiene, dias_atras=10, cerrado_en_horas=4)
        self.incidente(self.de_baja, dias_atras=5)
        # Fuera de los últimos 30 días
        self.incidente(self.higiene, dias_atras=60)

        app = FastAPI()
        app.include_router(router)
        app.dependency_overrides[get_db] = lambda: self.db
        self.client = TestClient(app)

    def tearDown(self):
        self.client.close()
        self.db.close()
        self.engine.dispose()

    def persona(self, nombre, administrar):
        persona = Personal(nombre=nombre, apellido='Test', dni=nombre, nroLegajo=nombre, email=f'{nombre}@example.com',
                           username=nombre, hashed_password='unused', operar=True, administrar=administrar, activo=True)
        self.db.add(persona)
        self.db.commit()
        return persona

    def incidente(self, tipo, dias_atras, cerrado_en_horas=None):
        momento = datetime.combine(self.hoy - timedelta(days=dias_atras), time(9))
        incidente = Incidente(descripcion=f'{tipo.nombre} {dias_atras}', tipo_id=tipo.id, reportado_por_dni=self.operario.dni,
                              fecha_hora=momento,
                              estado=EstadoIncidente.CERRADO if cerrado_en_horas else EstadoIncidente.ABIERTO)
        self.db.add(incidente)
        self.db.flush()
        if cerrado_en_horas:
            self.db.add(AccionCorrectiva(incidente_id=incidente.id, descripcion='Corregido', responsable_id=self.admin.id,
                                         fecha_cierre=momento + timedelta(hours=cerrado_en_horas), vigente=True))
        self.db.commit()

    def get(self, persona=None, **params):
        persona = persona or self.admin
        headers = {'Authorization': 'Bearer ' + create_access_token(persona)}
        return self.client.get('/incidentes/estadisticas', params=params, headers=headers)

    def por_nombre(self, datos):
        return {item['tipo']['nombre']: item for item in datos['por_tipo']}

    def test_por_defecto_ultimos_30_dias(self):
        respuesta = self.get()
        self.assertEqual(respuesta.status_code, 200, respuesta.text)
        datos = respuesta.json()
        self.assertEqual(datos['fecha_hasta'], self.hoy.isoformat())
        self.assertEqual(datos['fecha_desde'], (self.hoy - timedelta(days=29)).isoformat())
        self.assertEqual((datos['total'], datos['abiertos'], datos['cerrados']), (4, 2, 2))

    def test_cuenta_por_tipo_con_abiertos_y_cerrados(self):
        tipos = self.por_nombre(self.get().json())
        self.assertEqual((tipos['Plagas']['total'], tipos['Plagas']['abiertos'], tipos['Plagas']['cerrados']), (2, 1, 1))
        self.assertEqual(tipos['Higiene']['total'], 1)

    def test_tipos_activos_en_cero_y_de_baja_solo_con_incidentes(self):
        tipos = self.por_nombre(self.get().json())
        self.assertEqual(tipos['Sin uso']['total'], 0)
        self.assertEqual(tipos['De baja']['total'], 1)
        self.assertNotIn('De baja vacío', tipos)

    def test_rango_de_fechas(self):
        datos = self.get(fecha_desde=(self.hoy - timedelta(days=5)).isoformat(), fecha_hasta=self.hoy.isoformat()).json()
        self.assertEqual(datos['total'], 3)  # plagas x2 + de baja
        self.assertEqual(self.por_nombre(datos)['Higiene']['total'], 0)

    def test_evolucion_agrupada_y_completa(self):
        datos = self.get().json()
        self.assertEqual(datos['agrupacion'], 'dia')
        self.assertEqual(len(datos['evolucion']), 30)
        self.assertEqual(sum(punto['cantidad'] for punto in datos['evolucion']), datos['total'])
        desde = (self.hoy - timedelta(days=89)).isoformat()
        self.assertEqual(self.get(fecha_desde=desde).json()['agrupacion'], 'semana')
        desde = (self.hoy - timedelta(days=364)).isoformat()
        anual = self.get(fecha_desde=desde).json()
        self.assertEqual(anual['agrupacion'], 'mes')
        self.assertEqual(sum(punto['cantidad'] for punto in anual['evolucion']), 5)

    def test_promedio_de_resolucion_en_horas(self):
        self.assertEqual(self.get().json()['promedio_horas_resolucion'], 3.0)  # (2 h + 4 h) / 2

    def test_sin_cerrados_no_hay_promedio(self):
        hoy = self.hoy.isoformat()
        self.assertIsNone(self.get(fecha_desde=hoy, fecha_hasta=hoy).json()['promedio_horas_resolucion'])

    def test_rangos_invalidos(self):
        respuesta = self.get(fecha_desde=self.hoy.isoformat(), fecha_hasta=(self.hoy - timedelta(days=1)).isoformat())
        self.assertEqual(respuesta.status_code, 400)
        respuesta = self.get(fecha_desde=(self.hoy - timedelta(days=800)).isoformat())
        self.assertEqual(respuesta.status_code, 400)

    def test_solo_administradores(self):
        self.assertEqual(self.get(self.operario).status_code, 403)
        self.assertEqual(self.client.get('/incidentes/estadisticas').status_code, 401)

    def test_coincide_con_el_listado_filtrado_por_tipo(self):
        desde = (self.hoy - timedelta(days=29)).isoformat()
        headers = {'Authorization': 'Bearer ' + create_access_token(self.admin)}
        listado = self.client.get('/incidentes/', params={'tipo_id': self.plagas.id, 'fecha_desde': desde,
                                                         'fecha_hasta': self.hoy.isoformat()}, headers=headers)
        self.assertEqual(listado.json()['total'], self.por_nombre(self.get().json())['Plagas']['total'])


if __name__ == '__main__':
    unittest.main()
