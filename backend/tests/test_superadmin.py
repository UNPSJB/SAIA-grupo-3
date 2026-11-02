import unittest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from src.main import app as registered_app
from src.personal.router import router
from src.personal.models import Personal
from src.models import ModeloBase
from src.database import get_db
from src.auth.utils import create_access_token
from scripts.migrate_superadmin import migrate


class RolesTest(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine('sqlite://', connect_args={'check_same_thread': False}, poolclass=StaticPool)
        ModeloBase.metadata.create_all(self.engine)
        self.db = sessionmaker(bind=self.engine)()
        self.users = {}
        for name, admin in [('manager', True), ('other', True), ('worker', False)]:
            user = Personal(nombre=name, apellido='Test', dni=name, nroLegajo=name, email=f'{name}@example.com', username=name, hashed_password='unused', operar=True, administrar=admin, activo=True)
            self.db.add(user)
            self.users[name] = user
        self.db.commit()
        app = FastAPI()
        app.include_router(router)
        app.dependency_overrides[get_db] = lambda: self.db
        self.client = TestClient(app)

    def tearDown(self):
        self.client.close()
        self.db.close()
        self.engine.dispose()

    def request(self, actor, method, target='worker', **kwargs):
        headers = {'Authorization': 'Bearer ' + create_access_token(self.users[actor])}
        url = '/personal/' if target is None else f'/personal/{self.users[target].id}'
        return self.client.request(method, url, headers=headers, **kwargs)

    def payload(self, **changes):
        base_payload = dict(nombre='New', apellido='Test', dni='new', nroLegajo='new', email='new@example.com', username='newuser', password='test123', operar=True)
        base_payload.update(changes)
        return base_payload

    def test_admin_creates_operator(self):
        r = self.request('manager', 'POST', None, json=self.payload())
        self.assertEqual(r.status_code, 200, r.text)
        self.assertTrue(r.json()['operar'])
        self.assertFalse(r.json()['administrar'])

    def test_admin_operator_management(self):
        for changes in [{'nombre': 'Updated', 'operar': True, 'administrar': False}, {'activo': False}, {'activo': True}]:
            r = self.request('manager', 'PUT', json=changes)
            self.assertEqual(r.status_code, 200, r.text)
        self.assertEqual(self.request('manager', 'DELETE').status_code, 200)
        self.assertEqual(self.request('manager', 'PUT', json={'activo': True}).status_code, 200)

    def test_operator_denied(self):
        self.assertEqual(self.request('worker', 'POST', None, json=self.payload()).status_code, 403)
        self.assertEqual(self.request('worker', 'PUT', json={'administrar': True}).status_code, 403)
        self.assertEqual(self.request('worker', 'DELETE', 'other').status_code, 403)
        self.assertEqual(self.request('worker', 'GET', 'manager').status_code, 403)

