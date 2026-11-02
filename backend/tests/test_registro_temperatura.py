import unittest
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

class RegistroTemperaturaTest(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine('sqlite://', connect_args={'check_same_thread': False}, poolclass=StaticPool)
        ModeloBase.metadata.create_all(self.engine)
        self.db = sessionmaker(bind=self.engine)()
        self.operario = Personal(nombre='operario', apellido='Test', dni='123', nroLegajo='123', email='op@test.com', username='operario', hashed_password='x', operar=True, administrar=False, activo=True)
        self.db.add(self.operario)

        self.sector = Sector(nombre="Cocina", activo=True)
        self.db.add(self.sector)
        self.db.flush()

        self.heladera = Equipo(
            numero_serie="H-01",
            nombre="Heladera Principal",
            tipo=TipoEquipo.EQUIPO,
            sector_id=self.sector.id,
            activo=True,
            controla_temperatura=True,
            temperatura_minima=2.0,
            temperatura_maxima=8.0
        )
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

    def test_lectura_parametrizada(self):
        casos = [
            (5.0, None, 200, False),
            (10.0, "Cambié el termostato", 200, True),
            (1.0, "Puerta estaba abierta, la cerré", 200, True)
        ]

        for temp, accion, status_esperado, fuera_esperado in casos:
            with self.subTest(temp=temp, accion=accion):
                payload = {
                    "equipo_id": self.heladera.id,
                    "temperatura_registrada": temp,
                    "accion_tomada": accion
                }
                respuesta = self.client.post('/registros-temperatura/', json=payload, headers=self.headers)

                self.assertEqual(respuesta.status_code, status_esperado, respuesta.text)
                datos = respuesta.json()
                self.assertEqual(datos["temperatura_registrada"], temp)
                self.assertEqual(datos["fuera_de_rango"], fuera_esperado)


    def test_lectura_fuera_de_rango_sin_accion_es_rechazada(self):
        payload = {
            "equipo_id": self.heladera.id,
            "temperatura_registrada": 15.0,
            "accion_tomada": None
        }
        respuesta = self.client.post('/registros-temperatura/', json=payload, headers=self.headers)

        self.assertEqual(respuesta.status_code, 400)
        self.assertIn("Debés indicar la acción tomada", respuesta.json()["detail"])

    def test_genera_notificacion_al_registrar_fuera_de_rango(self):
        payload = {
            "equipo_id": self.heladera.id,
            "temperatura_registrada": -5.0,
            "accion_tomada": "Llamé al técnico"
        }
        respuesta = self.client.post('/registros-temperatura/', json=payload, headers=self.headers)
        self.assertEqual(respuesta.status_code, 200)

        notificacion = self.db.query(Notificacion).filter(
            Notificacion.tipo == TipoNotificacion.TEMPERATURA_FUERA_RANGO
        ).first()

        self.assertIsNotNone(notificacion)
        self.assertIn("Heladera Principal", notificacion.mensaje)
        self.assertIn("-5.0", notificacion.mensaje)
    def test_accion_en_blanco_no_justifica_temperatura_fuera_de_rango(self):
        respuesta = self.client.post('/registros-temperatura/', json={
            'equipo_id': self.heladera.id, 'temperatura_registrada': 20,
            'accion_tomada': '   ',
        }, headers=self.headers)
        self.assertEqual(respuesta.status_code, 400)

    def test_limites_inclusivos_y_rechazo_no_finito(self):
        for temperatura in (2.0, 8.0):
            respuesta = self.client.post('/registros-temperatura/', json={
                'equipo_id': self.heladera.id, 'temperatura_registrada': temperatura,
            }, headers=self.headers)
            self.assertEqual(respuesta.status_code, 200)
            self.assertFalse(respuesta.json()['fuera_de_rango'])
        for temperatura in ('NaN', 'Infinity', '-Infinity'):
            respuesta = self.client.post('/registros-temperatura/', json={
                'equipo_id': self.heladera.id, 'temperatura_registrada': temperatura,
            }, headers=self.headers)
            self.assertEqual(respuesta.status_code, 422)

    def test_configuracion_invalida_no_causa_error_interno(self):
        self.heladera.temperatura_maxima = None
        self.db.commit()
        respuesta = self.client.post('/registros-temperatura/', json={
            'equipo_id': self.heladera.id, 'temperatura_registrada': 5,
        }, headers=self.headers)
        self.assertEqual(respuesta.status_code, 409)

    def test_actualizar_rango_parcial_valida_configuracion_final(self):
        from fastapi import HTTPException
        from src.equipos.schemas import EquipoUpdate
        from src.equipos.services import modificar_equipo
        modificar_equipo(self.db, self.heladera.id, EquipoUpdate(temperatura_minima=3))
        self.assertEqual(self.heladera.temperatura_minima, 3)
        with self.assertRaises(HTTPException) as error:
            modificar_equipo(self.db, self.heladera.id, EquipoUpdate(temperatura_minima=12))
        self.assertEqual(error.exception.status_code, 422)
        self.assertEqual(self.heladera.temperatura_minima, 3)
