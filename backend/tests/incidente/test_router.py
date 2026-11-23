from datetime import date, datetime, time, timedelta
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from src.main import app as registered_app
from src.accionCorrectiva.models import AccionCorrectiva
from src.auth.utils import create_access_token
from src.database import get_db
from src.incidente.constants import EstadoIncidente
from src.incidente.models import Incidente
from src.incidente.router import router
from src.models import ModeloBase
from src.personal.models import Personal
from src.tipoIncidente.models import TipoIncidente
from src.archivos import services as archivos_services

class Escenario:

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
        self.incidente(self.plagas, dias_atras=1, cerrado_en_horas=2)
        self.incidente(self.plagas, dias_atras=3)
        self.incidente(self.higiene, dias_atras=10, cerrado_en_horas=4)
        self.incidente(self.de_baja, dias_atras=5)
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
        persona = Personal(nombre=nombre, apellido='Test', dni=nombre, nroLegajo=nombre, email=f'{nombre}@example.com', username=nombre, hashed_password='unused', operar=True, administrar=administrar, activo=True)
        self.db.add(persona)
        self.db.commit()
        return persona

    def incidente(self, tipo, dias_atras, cerrado_en_horas=None):
        momento = datetime.combine(self.hoy - timedelta(days=dias_atras), time(9))
        incidente = Incidente(descripcion=f'{tipo.nombre} {dias_atras}', tipo_id=tipo.id, reportado_por_dni=self.operario.dni, fecha_hora=momento, estado=EstadoIncidente.CERRADO if cerrado_en_horas else EstadoIncidente.ABIERTO)
        self.db.add(incidente)
        self.db.flush()
        if cerrado_en_horas:
            self.db.add(AccionCorrectiva(incidente_id=incidente.id, descripcion='Corregido', responsable_id=self.admin.id, fecha_cierre=momento + timedelta(hours=cerrado_en_horas), vigente=True))
        self.db.commit()

    def get(self, persona=None, **params):
        persona = persona or self.admin
        headers = {'Authorization': 'Bearer ' + create_access_token(persona)}
        return self.client.get('/incidentes/estadisticas', params=params, headers=headers)

    def por_nombre(self, datos):
        return {item['tipo']['nombre']: item for item in datos['por_tipo']}
import pytest

@pytest.fixture
def escenario():
    caso = Escenario()
    caso.setUp()
    try:
        yield caso
    finally:
        caso.tearDown()

def test_por_defecto_ultimos_30_dias(escenario):
    self = escenario
    respuesta = self.get()
    assert respuesta.status_code == 200, respuesta.text
    datos = respuesta.json()
    assert datos['fecha_hasta'] == self.hoy.isoformat()
    assert datos['fecha_desde'] == (self.hoy - timedelta(days=29)).isoformat()
    assert (datos['total'], datos['abiertos'], datos['cerrados']) == (4, 2, 2)

def test_cuenta_por_tipo_con_abiertos_y_cerrados(escenario):
    self = escenario
    tipos = self.por_nombre(self.get().json())
    assert (tipos['Plagas']['total'], tipos['Plagas']['abiertos'], tipos['Plagas']['cerrados']) == (2, 1, 1)
    assert tipos['Higiene']['total'] == 1

def test_tipos_activos_en_cero_y_de_baja_solo_con_incidentes(escenario):
    self = escenario
    tipos = self.por_nombre(self.get().json())
    assert tipos['Sin uso']['total'] == 0
    assert tipos['De baja']['total'] == 1
    assert 'De baja vacío' not in tipos

def test_rango_de_fechas(escenario):
    self = escenario
    datos = self.get(fecha_desde=(self.hoy - timedelta(days=5)).isoformat(), fecha_hasta=self.hoy.isoformat()).json()
    assert datos['total'] == 3
    assert self.por_nombre(datos)['Higiene']['total'] == 0

def test_evolucion_agrupada_y_completa(escenario):
    self = escenario
    datos = self.get().json()
    assert datos['agrupacion'] == 'dia'
    assert len(datos['evolucion']) == 30
    assert sum((punto['cantidad'] for punto in datos['evolucion'])) == datos['total']
    desde = (self.hoy - timedelta(days=89)).isoformat()
    assert self.get(fecha_desde=desde).json()['agrupacion'] == 'semana'
    desde = (self.hoy - timedelta(days=364)).isoformat()
    anual = self.get(fecha_desde=desde).json()
    assert anual['agrupacion'] == 'mes'
    assert sum((punto['cantidad'] for punto in anual['evolucion'])) == 5

def test_promedio_de_resolucion_en_horas(escenario):
    self = escenario
    assert self.get().json()['promedio_horas_resolucion'] == 3.0

def test_sin_cerrados_no_hay_promedio(escenario):
    self = escenario
    hoy = self.hoy.isoformat()
    assert self.get(fecha_desde=hoy, fecha_hasta=hoy).json()['promedio_horas_resolucion'] is None

def test_rangos_invalidos(escenario):
    self = escenario
    respuesta = self.get(fecha_desde=self.hoy.isoformat(), fecha_hasta=(self.hoy - timedelta(days=1)).isoformat())
    assert respuesta.status_code == 400
    respuesta = self.get(fecha_desde=(self.hoy - timedelta(days=800)).isoformat())
    assert respuesta.status_code == 400

def test_solo_administradores(escenario):
    self = escenario
    assert self.get(self.operario).status_code == 403
    assert self.client.get('/incidentes/estadisticas').status_code == 401

def test_coincide_con_el_listado_filtrado_por_tipo(escenario):
    self = escenario
    desde = (self.hoy - timedelta(days=29)).isoformat()
    headers = {'Authorization': 'Bearer ' + create_access_token(self.admin)}
    listado = self.client.get('/incidentes/', params={'tipo_id': self.plagas.id, 'fecha_desde': desde, 'fecha_hasta': self.hoy.isoformat()}, headers=headers)
    assert listado.json()['total'] == self.por_nombre(self.get().json())['Plagas']['total']

def test_operario_solo_ve_los_incidentes_que_reporto(
    client,
    headers_operadora,
    headers_otra_operadora,
    headers_administradora,
    tipo_plagas,
):
    propio = client.post(
        "/incidentes/",
        headers=headers_operadora,
        data={"descripcion": "Incidente propio", "tipo_id": str(tipo_plagas.id)},
    )
    assert propio.status_code == 200, propio.text
    propio_id = propio.json()["id"]

    ajeno = client.post(
        "/incidentes/",
        headers=headers_otra_operadora,
        data={"descripcion": "Incidente ajeno", "tipo_id": str(tipo_plagas.id)},
    )
    assert ajeno.status_code == 200, ajeno.text
    ajeno_id = ajeno.json()["id"]

    # Operario solo lista y consulta los suyos
    listado_operario = client.get("/incidentes/", headers=headers_operadora)
    assert listado_operario.status_code == 200
    assert [i["id"] for i in listado_operario.json()["items"]] == [propio_id]

    assert client.get(f"/incidentes/{propio_id}", headers=headers_operadora).status_code == 200
    assert client.get(f"/incidentes/{ajeno_id}", headers=headers_operadora).status_code == 403

    # Administración ve todos
    listado_admin = client.get("/incidentes/", headers=headers_administradora)
    assert listado_admin.status_code == 200
    assert listado_admin.json()["total"] == 2


def test_operario_no_puede_editar_ni_eliminar_incidentes(
    client, headers_operadora, tipo_plagas
):
    creado = client.post(
        "/incidentes/",
        headers=headers_operadora,
        data={"descripcion": "Incidente original", "tipo_id": str(tipo_plagas.id)},
    )
    assert creado.status_code == 200, creado.text
    incidente_id = creado.json()["id"]

    edicion = client.put(
        f"/incidentes/{incidente_id}",
        headers=headers_operadora,
        data={"descripcion": "Intento editar", "tipo_id": str(tipo_plagas.id)},
    )
    eliminacion = client.delete(
        f"/incidentes/{incidente_id}",
        headers=headers_operadora,
    )

    assert edicion.status_code == 403
    assert eliminacion.status_code == 403


def test_reportar_con_foto_guarda_archivo_y_rechaza_no_imagen(
    client, headers_operadora, tipo_plagas, tmp_path, monkeypatch
):
    monkeypatch.setattr(archivos_services, "UPLOADS_DIR", tmp_path)

    # Archivo válido (.png)
    ok = client.post(
        "/incidentes/",
        headers=headers_operadora,
        data={"descripcion": "Con foto válida", "tipo_id": str(tipo_plagas.id)},
        files={"foto": ("evidencia.png", b"\x89PNG\r\n\x1a\n", "image/png")},
    )
    assert ok.status_code == 200, ok.text
    imagen_path = ok.json()["imagen_path"]
    assert imagen_path is not None and imagen_path.endswith(".png")
    assert len(list(tmp_path.iterdir())) == 1

    # Archivo no permitido (.txt)
    rechazado = client.post(
        "/incidentes/",
        headers=headers_operadora,
        data={"descripcion": "Con archivo inválido", "tipo_id": str(tipo_plagas.id)},
        files={"foto": ("documento.txt", b"texto plano", "text/plain")},
    )
    assert rechazado.status_code == 400
    assert len(list(tmp_path.iterdir())) == 1


@pytest.mark.parametrize("descripcion", ["", "   "])
def test_reportar_incidente_con_descripcion_vacia_devuelve_422(
    client, headers_operadora, tipo_plagas, descripcion
):
    respuesta = client.post(
        "/incidentes/",
        headers=headers_operadora,
        data={"descripcion": descripcion, "tipo_id": str(tipo_plagas.id)},
    )

    assert respuesta.status_code == 422