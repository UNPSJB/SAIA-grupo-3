import os
os.environ["DB_URL"] = "sqlite://"
os.environ["DB_URL_TEST"] = "sqlite://"
os.environ["SCHEDULER_ACTIVO"] = "false"
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool
from fastapi.testclient import TestClient
from src.main import app
from src.models import ModeloBase
from src.database import get_db
from src.auth.dependencies import get_current_personal
from src.personal.models import Personal
from src.auth.utils import get_password_hash

@pytest.fixture
def db():
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    ModeloBase.metadata.create_all(engine)
    with Session(engine) as session:
        yield session
    engine.dispose()

@pytest.fixture
def client(db):
    app.dependency_overrides[get_db] = lambda: db
    client = TestClient(app)
    yield client
    client.close()
    app.dependency_overrides.clear()

@pytest.fixture
def user(db):
    user = Personal(nombre="Ana", apellido="Prueba", dni="12345", nroLegajo="1", email="ana@example.com", username="ana", hashed_password=get_password_hash("clave123"), operar=True, administrar=True, activo=True)
    db.add(user); db.commit(); db.refresh(user)
    return user

@pytest.fixture
def admin(client, user):
    app.dependency_overrides[get_current_personal] = lambda: user
    return client
