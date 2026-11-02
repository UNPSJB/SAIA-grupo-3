import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from datetime import date, timedelta
from uuid import uuid4

from src.auth.utils import create_access_token, get_password_hash
from src.abastecimiento.models import (
    ConsumoLoteRecepcion,
    ConsumoStockAnterior,
    LoteRecepcionInsumo,
    Proveedor,
)
from src.abastecimiento.router import router as abastecimiento_router
from src.documentacion.models import Documentacion
from src.perfil.router import router as perfil_router
from src.tipoDocumento.models import TipoDocumento
from src.database import get_db
from src.insumos.models import Insumo
from src.loteProduccion.router import router as lote_router
from src.models import ModeloBase
from src.personal.models import Personal
from src.producto.models import Producto
from src.producto.router import router as producto_router
from src.unidadMedida.models import TipoUnidadMedida, UnidadMedida
from src.unidadMedida.router import router as unidad_router
from src.main import app as registered_app  # noqa: F401 — registra todos los modelos en el metadata


engine = create_engine(
    "sqlite://",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

app = FastAPI()
app.include_router(producto_router)
app.include_router(lote_router)
app.include_router(abastecimiento_router)
app.include_router(unidad_router)
app.include_router(perfil_router)


@pytest.fixture(scope="function")
def db_session():
    ModeloBase.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        ModeloBase.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def client(db_session):
    def override_get_db():
        try:
            yield db_session
        finally:
            db_session.close()

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


# Conserva el nombre usado por las pruebas de vencimientos anteriores.
session = db_session


@pytest.fixture
def unidad_medida(db_session):
    unidad = UnidadMedida(tipo=TipoUnidadMedida.PESO, sufijo="kg", activo=True)
    db_session.add(unidad)
    db_session.commit()
    db_session.refresh(unidad)
    return unidad


@pytest.fixture
def producto(db_session, unidad_medida):
    producto = Producto(
        nombre="Pan",
        unidad_medida_id=unidad_medida.id,
        activo=True,
    )
    db_session.add(producto)
    db_session.commit()
    db_session.refresh(producto)
    return producto


@pytest.fixture
def insumo_activo(db_session, unidad_medida):
    insumo = Insumo(
        nombre="Harina",
        cantidad=50,
        unidad_medida_id=unidad_medida.id,
        activo=True,
    )
    db_session.add(insumo)
    db_session.commit()
    db_session.refresh(insumo)
    return insumo


@pytest.fixture
def otro_insumo_activo(db_session, unidad_medida):
    insumo = Insumo(
        nombre="Azúcar",
        cantidad=20,
        unidad_medida_id=unidad_medida.id,
        activo=True,
    )
    db_session.add(insumo)
    db_session.commit()
    db_session.refresh(insumo)
    return insumo


@pytest.fixture
def insumo_inactivo(db_session, unidad_medida):
    insumo = Insumo(
        nombre="Levadura",
        cantidad=10,
        unidad_medida_id=unidad_medida.id,
        activo=False,
    )
    db_session.add(insumo)
    db_session.commit()
    db_session.refresh(insumo)
    return insumo


@pytest.fixture
def persona_operadora(db_session):
    persona = Personal(
        nombre="Operadora",
        apellido="Prueba",
        dni="100",
        nroLegajo="100",
        email="operadora@example.com",
        username="operadora",
        hashed_password="unused",
        operar=True,
        administrar=False,
        activo=True,
    )
    db_session.add(persona)
    db_session.commit()
    db_session.refresh(persona)
    return persona


@pytest.fixture
def persona_administradora(db_session):
    persona = Personal(
        nombre="Administradora",
        apellido="Prueba",
        dni="300",
        nroLegajo="300",
        email="administradora@example.com",
        username="administradora",
        hashed_password="unused",
        operar=True,
        administrar=True,
        activo=True,
    )
    db_session.add(persona)
    db_session.commit()
    db_session.refresh(persona)
    return persona


@pytest.fixture
def headers_administradora(persona_administradora):
    token = create_access_token(persona_administradora)
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def persona_sin_permisos(db_session):
    persona = Personal(
        nombre="Usuario",
        apellido="Prueba",
        dni="200",
        nroLegajo="200",
        email="usuario@example.com",
        username="usuario",
        hashed_password="unused",
        operar=False,
        administrar=False,
        activo=True,
    )
    db_session.add(persona)
    db_session.commit()
    db_session.refresh(persona)
    return persona


@pytest.fixture
def proveedor_activo(db_session):
    proveedor = Proveedor(
        nombre="Proveedor de prueba",
        cuit="30123456789",
        activo=True,
    )
    db_session.add(proveedor)
    db_session.commit()
    db_session.refresh(proveedor)
    return proveedor


@pytest.fixture
def lote_recepcion(
    db_session,
    insumo_activo,
    proveedor_activo,
    persona_administradora,
):
    lote = LoteRecepcionInsumo(
        insumo_id=insumo_activo.id,
        proveedor_id=proveedor_activo.id,
        numero_lote="HAR-TRAZA-001",
        cantidad=12,
        cantidad_disponible=12,
        fecha_recepcion=date.today() - timedelta(days=1),
        fecha_vencimiento=date.today() + timedelta(days=30),
        registrado_por_id=persona_administradora.id,
        activo=True,
        conciliacion=False,
        clave_operacion=str(uuid4()),
    )
    db_session.add(lote)
    db_session.commit()
    db_session.refresh(lote)
    return lote


@pytest.fixture
def headers_operadora(persona_operadora):
    return {"Authorization": f"Bearer {create_access_token(persona_operadora)}"}


@pytest.fixture
def headers_sin_permisos(persona_sin_permisos):
    return {"Authorization": f"Bearer {create_access_token(persona_sin_permisos)}"}


PASSWORD_ACTUAL = "clave-actual-123"


@pytest.fixture
def persona_con_password(db_session):
    persona = Personal(
        nombre="Lucía",
        apellido="Pérez",
        dni="300",
        nroLegajo="L-300",
        email="lucia@example.com",
        username="lucia",
        hashed_password=get_password_hash(PASSWORD_ACTUAL),
        operar=True,
        administrar=False,
        activo=True,
    )
    db_session.add(persona)
    db_session.commit()
    db_session.refresh(persona)
    return persona


@pytest.fixture
def headers_con_password(persona_con_password):
    return {"Authorization": f"Bearer {create_access_token(persona_con_password)}"}


@pytest.fixture
def documentos_de_persona(db_session, persona_con_password, persona_operadora):
    hoy = date.today()
    tipos = [TipoDocumento(nombre=nombre, activo=True) for nombre in ("Libreta sanitaria", "Carnet de manipulador", "Apto físico", "Curso BPM")]
    db_session.add_all(tipos)
    db_session.flush()
    documentos = [
        Documentacion(personal_id=persona_con_password.id, tipo_documento_id=tipos[0].id, fecha_vencimiento=hoy + timedelta(days=90)),
        Documentacion(personal_id=persona_con_password.id, tipo_documento_id=tipos[1].id, fecha_vencimiento=hoy + timedelta(days=5)),
        Documentacion(personal_id=persona_con_password.id, tipo_documento_id=tipos[2].id, fecha_vencimiento=hoy - timedelta(days=3)),
        Documentacion(personal_id=persona_operadora.id, tipo_documento_id=tipos[3].id, fecha_vencimiento=hoy + timedelta(days=30)),
    ]
    db_session.add_all(documentos)
    db_session.commit()
    return documentos
