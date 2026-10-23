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
from migrate_superadmin import migrate


class RolesTest(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine('sqlite://', connect_args={'check_same_thread': False}, poolclass=StaticPool)
        ModeloBase.metadata.create_all(self.engine)
        self.db = sessionmaker(bind=self.engine)()
        self.users = {}
        for name, admin, superadmin in [('root', True, True), ('manager', True, False), ('other', True, False), ('worker', False, False)]:
            user = Personal(nombre=name, apellido='Test', dni=name, nroLegajo=name, email=f'{name}@example.com', username=name, hashed_password='unused', operar=True, administrar=admin, superadmin=superadmin, activo=True)
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
        return dict(nombre='New', apellido='Test', dni='new', nroLegajo='new', email='new@example.com', username='newuser', password='test123', **changes)

    def test_admin_creates_operator(self):
        r = self.request('manager', 'POST', None, json=self.payload())
        self.assertEqual(r.status_code, 200, r.text)
        self.assertTrue(r.json()['operar'])
        self.assertFalse(r.json()['administrar'])
        self.assertFalse(r.json()['superadmin'])

    def test_admin_restrictions(self):
        for changes in [{'administrar': True}, {'operar': False}, {'superadmin': True}]:
            self.assertEqual(self.request('manager', 'PUT', json=changes).status_code, 403)
        for target in ['manager', 'other', 'root']:
            for changes in [{'nombre': 'Hacked'}, {'password': 'hacked'}, {'activo': False}]:
                self.assertEqual(self.request('manager', 'PUT', target, json=changes).status_code, 403)
            self.assertEqual(self.request('manager', 'DELETE', target).status_code, 403)
        for changes in [{'administrar': True}, {'operar': False}]:
            self.assertEqual(self.request('manager', 'POST', None, json=self.payload(**changes)).status_code, 403)

    def test_admin_operator_management(self):
        for changes in [{'nombre': 'Updated', 'operar': True, 'administrar': False}, {'activo': False}, {'activo': True}]:
            r = self.request('manager', 'PUT', json=changes)
            self.assertEqual(r.status_code, 200, r.text)
        self.assertEqual(self.request('manager', 'DELETE').status_code, 200)
        self.assertEqual(self.request('manager', 'PUT', json={'activo': True}).status_code, 200)

    def test_superadmin_permissions(self):
        for changes in [{'administrar': True}, {'administrar': False, 'operar': False}, {'operar': True}]:
            r = self.request('root', 'PUT', json=changes)
            self.assertEqual(r.status_code, 200, r.text)
        self.assertEqual(self.request('root', 'PUT', 'other', json={'administrar': False}).status_code, 200)
        self.assertEqual(self.request('root', 'POST', None, json=self.payload(administrar=True, operar=False)).status_code, 200)

    def test_superadmin_protection(self):
        for changes in [{'administrar': False}, {'operar': False}, {'activo': False}, {'superadmin': False}]:
            self.assertEqual(self.request('root', 'PUT', 'root', json=changes).status_code, 403)
        self.assertEqual(self.request('root', 'DELETE', 'root').status_code, 403)
        self.assertEqual(self.request('root', 'POST', None, json=self.payload(superadmin=True)).status_code, 403)
        self.assertEqual(self.request('root', 'GET', 'root').json()['role_name'], 'superadmin')

    def test_operator_denied(self):
        self.assertEqual(self.request('worker', 'POST', None, json=self.payload()).status_code, 403)
        self.assertEqual(self.request('worker', 'PUT', json={'administrar': True}).status_code, 403)
        self.assertEqual(self.request('worker', 'DELETE', 'other').status_code, 403)
        self.assertEqual(self.request('worker', 'GET', None).status_code, 403)


class MigrationTest(unittest.TestCase):
    def test_repeatable_preserves_data(self):
        engine = create_engine('sqlite://')
        with engine.begin() as c:
            c.execute(text('CREATE TABLE personal (id INTEGER PRIMARY KEY, username TEXT, nombre TEXT, operar BOOLEAN, administrar BOOLEAN, activo BOOLEAN)'))
            c.execute(text("INSERT INTO personal VALUES (1,'admin','Original',0,1,1),(2,'other','Other',0,1,1)"))
        migrate(engine)
        migrate(engine)
        with engine.connect() as c:
            rows = c.execute(text('SELECT username,nombre,operar,administrar,superadmin FROM personal ORDER BY id')).all()
        self.assertEqual(rows, [('admin', 'Original', 1, 1, 1), ('other', 'Other', 0, 1, 0)])
        engine.dispose()
