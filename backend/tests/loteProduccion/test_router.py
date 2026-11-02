from datetime import date
from datetime import timedelta
from uuid import uuid4

from src.abastecimiento.models import ConsumoLoteRecepcion, LoteRecepcionInsumo
from tests.abastecimiento.stock_trazable import identificar_stock
from sqlalchemy import select

from tests.database import (
    client,
    headers_administradora,
    headers_operadora,
    headers_sin_permisos,
    insumo_activo,
    insumo_inactivo,
    lote_recepcion,
    otro_insumo_activo,
    persona_administradora,
    persona_operadora,
    persona_sin_permisos,
    producto,
    proveedor_activo,
    db_session,
    unidad_medida,
)


def test_endpoint_registrar_lote_con_insumos(
    client,
    db_session,
    persona_operadora,
    headers_operadora,
    producto,
    insumo_activo,
    otro_insumo_activo,
):
    lotes = identificar_stock(db_session, persona_operadora, insumo_activo, otro_insumo_activo)
    # Act
    respuesta = client.post(
        "/lotes-produccion/",
        headers=headers_operadora,
        json={
            "producto_id": producto.id,
            "fecha_produccion": date.today().isoformat(),
            "cantidad": 12.5,
            "insumos": [
                {
                    "insumo_id": insumo_activo.id,
                    "cantidad_usada": 2.5,
                    "lotes_recepcion": [
                        {
                            "lote_recepcion_id": lotes[insumo_activo.id],
                            "cantidad": 2.5,
                        }
                    ],
                },
                {
                    "insumo_id": otro_insumo_activo.id,
                    "cantidad_usada": 1.25,
                    "lotes_recepcion": [
                        {
                            "lote_recepcion_id": lotes[otro_insumo_activo.id],
                            "cantidad": 1.25,
                        }
                    ],
                },
            ],
        },
    )
    assert respuesta.status_code == 200
    datos = respuesta.json()

    # Assert
    detalles = {
        asociado["insumo_id"]: asociado
        for asociado in datos["insumos_asociados"]
    }
    assert {
        insumo_id: asociado["cantidad_usada"] for insumo_id, asociado in detalles.items()
    } == {
        insumo_activo.id: 2.5,
        otro_insumo_activo.id: 1.25,
    }
    assert detalles[insumo_activo.id]["insumo"]["unidadMedidaObj"]["sufijo"] == "kg"
    assert "cantidad" not in detalles[insumo_activo.id]["insumo"]


def test_endpoint_listar_insumos_disponibles_solo_activos(
    client,
    headers_operadora,
    insumo_activo,
    insumo_inactivo,
):
    # Act
    respuesta = client.get(
        "/lotes-produccion/insumos-disponibles",
        headers=headers_operadora,
    )
    datos = respuesta.json()

    # Assert
    assert respuesta.status_code == 200
    assert [insumo["id"] for insumo in datos] == [insumo_activo.id]
    assert datos[0]["nombre"] == "Harina"
    assert datos[0]["cantidad"] == 0
    assert datos[0]["unidadMedidaObj"]["sufijo"] == "kg"


def test_endpoint_lista_lotes_utilizables_ordenados_por_vencimiento_proximo(
    client,
    headers_operadora,
    insumo_activo,
    lote_recepcion,
    db_session,
    persona_administradora,
):
    segundo = LoteRecepcionInsumo(
        insumo_id=insumo_activo.id,
        proveedor_id=lote_recepcion.proveedor_id,
        numero_lote="HAR-TRAZA-002",
        cantidad=10,
        cantidad_disponible=10,
        fecha_recepcion=date.today() - timedelta(days=2),
        fecha_vencimiento=date.today() + timedelta(days=60),
        registrado_por_id=persona_administradora.id,
        activo=True,
        conciliacion=False,
        clave_operacion=str(uuid4()),
    )
    db_session.add(segundo)
    db_session.commit()

    respuesta = client.get(
        f"/lotes-produccion/insumos/{insumo_activo.id}/lotes-disponibles",
        params={"fecha_produccion": date.today().isoformat()},
        headers=headers_operadora,
    )

    assert respuesta.status_code == 200
    assert [lote["id"] for lote in respuesta.json()] == [
        lote_recepcion.id,
        segundo.id,
    ]
    assert respuesta.json()[0]["es_vencimiento_proximo"] is True
    assert respuesta.json()[1]["es_vencimiento_proximo"] is False


def test_endpoint_registra_consumo_distribuido_manualmente_entre_recepciones(
    client,
    db_session,
    headers_operadora,
    producto,
    insumo_activo,
    lote_recepcion,
    persona_administradora,
):
    segundo = LoteRecepcionInsumo(
        insumo_id=insumo_activo.id,
        proveedor_id=lote_recepcion.proveedor_id,
        numero_lote="HAR-TRAZA-002",
        cantidad=10,
        cantidad_disponible=10,
        fecha_recepcion=date.today() - timedelta(days=2),
        fecha_vencimiento=date.today() + timedelta(days=60),
        registrado_por_id=persona_administradora.id,
        activo=True,
        conciliacion=False,
        clave_operacion=str(uuid4()),
    )
    db_session.add(segundo)
    db_session.commit()
    lote_recepcion_id = lote_recepcion.id
    segundo_id = segundo.id

    respuesta = client.post(
        "/lotes-produccion/",
        headers=headers_operadora,
        json={
            "producto_id": producto.id,
            "fecha_produccion": date.today().isoformat(),
            "cantidad": 12,
            "insumos": [
                {
                    "insumo_id": insumo_activo.id,
                    "cantidad_usada": 15,
                    "lotes_recepcion": [
                        {"lote_recepcion_id": lote_recepcion_id, "cantidad": 8},
                        {"lote_recepcion_id": segundo_id, "cantidad": 7},
                    ],
                }
            ],
        },
    )

    assert respuesta.status_code == 200, respuesta.text
    assert db_session.get(LoteRecepcionInsumo, lote_recepcion_id).cantidad_disponible == 4
    assert db_session.get(LoteRecepcionInsumo, segundo_id).cantidad_disponible == 3
    consumos = db_session.scalars(
        select(ConsumoLoteRecepcion).order_by(ConsumoLoteRecepcion.lote_recepcion_id)
    ).all()
    assert [consumo.cantidad for consumo in consumos] == [8, 7]


def test_endpoint_rechaza_si_el_lote_elegido_no_tiene_saldo_suficiente(
    client,
    db_session,
    headers_operadora,
    producto,
    insumo_activo,
    lote_recepcion,
    persona_administradora,
):
    segundo = LoteRecepcionInsumo(
        insumo_id=insumo_activo.id,
        proveedor_id=lote_recepcion.proveedor_id,
        numero_lote="HAR-TRAZA-002",
        cantidad=10,
        cantidad_disponible=10,
        fecha_recepcion=date.today() - timedelta(days=2),
        fecha_vencimiento=date.today() + timedelta(days=60),
        registrado_por_id=persona_administradora.id,
        activo=True,
        conciliacion=False,
        clave_operacion=str(uuid4()),
    )
    db_session.add(segundo)
    db_session.commit()
    lote_recepcion_id = lote_recepcion.id
    segundo_id = segundo.id

    respuesta = client.post(
        "/lotes-produccion/",
        headers=headers_operadora,
        json={
            "producto_id": producto.id,
            "fecha_produccion": date.today().isoformat(),
            "cantidad": 12,
            "insumos": [
                {
                    "insumo_id": insumo_activo.id,
                    "cantidad_usada": 13,
                    "lotes_recepcion": [
                        {"lote_recepcion_id": lote_recepcion_id, "cantidad": 13},
                    ],
                }
            ],
        },
    )

    assert respuesta.status_code == 409
    assert "saldo disponible" in respuesta.json()["detail"]
    assert db_session.get(LoteRecepcionInsumo, lote_recepcion_id).cantidad_disponible == 12
    assert db_session.get(LoteRecepcionInsumo, segundo_id).cantidad_disponible == 10
    assert db_session.scalars(select(ConsumoLoteRecepcion)).all() == []


def test_endpoint_rechaza_distribucion_distinta_a_cantidad_usada(
    client,
    db_session,
    headers_operadora,
    producto,
    insumo_activo,
    lote_recepcion,
):
    lote_recepcion_id = lote_recepcion.id
    respuesta = client.post(
        "/lotes-produccion/",
        headers=headers_operadora,
        json={
            "producto_id": producto.id,
            "fecha_produccion": date.today().isoformat(),
            "cantidad": 12,
            "insumos": [
                {
                    "insumo_id": insumo_activo.id,
                    "cantidad_usada": 5,
                    "lotes_recepcion": [
                        {"lote_recepcion_id": lote_recepcion_id, "cantidad": 4},
                    ],
                }
            ],
        },
    )

    assert respuesta.status_code == 422
    assert db_session.scalars(select(ConsumoLoteRecepcion)).all() == []
    assert db_session.get(LoteRecepcionInsumo, lote_recepcion_id).cantidad_disponible == 12


def test_endpoint_insumos_disponibles_requiere_permiso(
    client,
    headers_sin_permisos,
    insumo_activo,
):
    # Act
    sin_token = client.get("/lotes-produccion/insumos-disponibles")
    sin_permiso = client.get(
        "/lotes-produccion/insumos-disponibles",
        headers=headers_sin_permisos,
    )
    ruta_lotes = f"/lotes-produccion/insumos/{insumo_activo.id}/lotes-disponibles"
    sin_token_lotes = client.get(
        ruta_lotes,
        params={"fecha_produccion": date.today().isoformat()},
    )
    sin_permiso_lotes = client.get(
        ruta_lotes,
        params={"fecha_produccion": date.today().isoformat()},
        headers=headers_sin_permisos,
    )

    # Assert
    assert sin_token.status_code == 401
    assert sin_permiso.status_code == 403
    assert sin_token_lotes.status_code == 401
    assert sin_permiso_lotes.status_code == 403


def test_endpoint_no_registra_lote_con_insumo_inactivo(
    client,
    headers_operadora,
    producto,
    insumo_inactivo,
):
    # Act
    respuesta = client.post(
        "/lotes-produccion/",
        headers=headers_operadora,
        json={
            "producto_id": producto.id,
            "fecha_produccion": date.today().isoformat(),
            "cantidad": 12.5,
            "insumos": [{"insumo_id": insumo_inactivo.id, "cantidad_usada": 1}],
        },
    )

    # Assert
    assert respuesta.status_code == 400
    assert respuesta.json()["detail"] == "No se pueden asociar insumos dados de baja."


def test_endpoint_no_registra_lote_con_insumo_duplicado(
    client,
    headers_operadora,
    producto,
    insumo_activo,
):
    # Act
    respuesta = client.post(
        "/lotes-produccion/",
        headers=headers_operadora,
        json={
            "producto_id": producto.id,
            "fecha_produccion": date.today().isoformat(),
            "cantidad": 12.5,
            "insumos": [
                {"insumo_id": insumo_activo.id, "cantidad_usada": 1},
                {"insumo_id": insumo_activo.id, "cantidad_usada": 2},
            ],
        },
    )

    # Assert
    assert respuesta.status_code == 400
    assert respuesta.json()["detail"] == "No se puede asociar el mismo insumo más de una vez al lote."


def test_endpoint_no_registra_lote_con_cantidad_usada_cero(
    client,
    headers_operadora,
    producto,
    insumo_activo,
):
    # Act
    respuesta = client.post(
        "/lotes-produccion/",
        headers=headers_operadora,
        json={
            "producto_id": producto.id,
            "fecha_produccion": date.today().isoformat(),
            "cantidad": 12.5,
            "insumos": [{"insumo_id": insumo_activo.id, "cantidad_usada": 0}],
        },
    )

    # Assert
    assert respuesta.status_code == 422


def test_endpoint_no_registra_lote_si_falta_stock(
    client,
    headers_operadora,
    producto,
    insumo_activo,
):
    # Act
    respuesta = client.post(
        "/lotes-produccion/",
        headers=headers_operadora,
        json={
            "producto_id": producto.id,
            "fecha_produccion": date.today().isoformat(),
            "cantidad": 12.5,
            "insumos": [{"insumo_id": insumo_activo.id, "cantidad_usada": 51}],
        },
    )

    # Assert
    assert respuesta.status_code == 400
    assert respuesta.json()["detail"] == (
        "Uno o más insumos no tienen stock suficiente para las cantidades indicadas."
    )


def test_endpoint_buscar_lote_y_consultar_trazabilidad_en_ambos_sentidos(
    client,
    headers_administradora,
    headers_operadora,
    producto,
    insumo_activo,
    lote_recepcion,
):
    producto_id = producto.id
    nombre_producto = producto.nombre
    insumo_id = insumo_activo.id
    lote_recepcion_id = lote_recepcion.id
    numero_lote = lote_recepcion.numero_lote
    proveedor_nombre = lote_recepcion.proveedor.nombre
    fecha_recepcion = lote_recepcion.fecha_recepcion.isoformat()
    fecha_vencimiento = lote_recepcion.fecha_vencimiento.isoformat()
    fecha_produccion = date.today().isoformat()

    alta = client.post(
        "/lotes-produccion/",
        headers=headers_operadora,
        json={
            "producto_id": producto_id,
            "fecha_produccion": fecha_produccion,
            "cantidad": 8,
            "insumos": [
                {
                    "insumo_id": insumo_id,
                    "cantidad_usada": 3,
                    "lotes_recepcion": [
                        {"lote_recepcion_id": lote_recepcion_id, "cantidad": 3},
                    ],
                },
            ],
        },
    )
    assert alta.status_code == 200, alta.text
    lote_produccion_id = alta.json()["id"]

    busqueda = client.get(
        "/lotes-insumo/",
        params={"buscar": "TRAZA-001"},
        headers=headers_administradora,
    )
    assert busqueda.status_code == 200, busqueda.text
    assert busqueda.json()["total"] == 1
    assert busqueda.json()["items"][0]["id"] == lote_recepcion_id

    for termino in ("Harina", "Proveedor de prueba"):
        busqueda = client.get(
            "/lotes-insumo/",
            params={"buscar": termino},
            headers=headers_administradora,
        )
        assert busqueda.status_code == 200, busqueda.text
        assert busqueda.json()["total"] == 1
        assert busqueda.json()["items"][0]["id"] == lote_recepcion_id

    hacia_adelante = client.get(
        f"/lotes-insumo/{lote_recepcion_id}/trazabilidad",
        headers=headers_administradora,
    )
    assert hacia_adelante.status_code == 200, hacia_adelante.text
    assert hacia_adelante.json() == [
        {
            "lote_produccion_id": lote_produccion_id,
            "codigo": alta.json()["codigo"],
            "producto": nombre_producto,
            "fecha_produccion": fecha_produccion,
            "cantidad_utilizada": 3,
            "activo": True,
        }
    ]

    hacia_atras = client.get(
        f"/lotes-produccion/{lote_produccion_id}/trazabilidad",
        headers=headers_administradora,
    )
    assert hacia_atras.status_code == 200, hacia_atras.text
    insumo = hacia_atras.json()["insumos"][0]
    assert insumo["insumo_id"] == insumo_id
    assert insumo["cantidad_usada"] == 3
    assert insumo["lotes_recepcion"] == [
        {
            "lote_recepcion_id": lote_recepcion_id,
            "numero_lote": numero_lote,
            "proveedor_nombre": proveedor_nombre,
            "fecha_recepcion": fecha_recepcion,
            "fecha_vencimiento": fecha_vencimiento,
            "cantidad_utilizada": 3,
        }
    ]
    assert insumo["cantidad_stock_anterior"] == 0
    assert insumo["cantidad_historica_sin_origen"] == 0


def test_endpoint_trazabilidad_requiere_administracion(
    client,
    headers_operadora,
    lote_recepcion,
):
    lote_recepcion_id = lote_recepcion.id
    respuesta = client.get(
        f"/lotes-insumo/{lote_recepcion_id}/trazabilidad",
        headers=headers_operadora,
    )
    assert respuesta.status_code == 403


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

def test_registrar_lote(escenario):
    self = escenario
    producto_id = self.crear_producto().json()['id']
    respuesta = self.crear_lote(producto_id, observaciones='Primera horneada')
    assert respuesta.status_code == 200, respuesta.text
    lote = respuesta.json()
    assert lote['registrado_por']['id'] == self.operario.id
    assert lote['producto']['nombre'] == 'Pan francés'
    assert lote['codigo'] == f'L-{date.today():%Y%m%d}-001'
    assert self.crear_lote(producto_id).json()['codigo'] == f'L-{date.today():%Y%m%d}-002'

def test_lote_validaciones(escenario):
    self = escenario
    producto_id = self.crear_producto().json()['id']
    manana = (date.today() + timedelta(days=1)).isoformat()
    assert self.crear_lote(producto_id, fecha_produccion=manana).status_code == 400
    assert self.crear_lote(producto_id, cantidad=0).status_code == 422
    assert self.crear_lote(999).status_code == 404
    self.client.delete(f'/productos/{producto_id}', headers=self.headers(self.admin))
    assert self.crear_lote(producto_id).status_code == 400

def test_solo_quien_opera_registra_lotes(escenario):
    self = escenario
    producto_id = self.crear_producto().json()['id']
    assert self.crear_lote(producto_id, persona=self.sin_permisos).status_code == 403
    assert self.client.post('/lotes-produccion/', json={}).status_code == 401

def test_operario_ve_solo_sus_lotes(escenario):
    self = escenario
    producto_id = self.crear_producto().json()['id']
    propio = self.crear_lote(producto_id).json()
    ajeno = self.crear_lote(producto_id, persona=self.otro_operario).json()
    operario = self.headers(self.operario)
    listado = self.client.get('/lotes-produccion/', headers=operario).json()
    assert [l['id'] for l in listado['items']] == [propio['id']]
    assert self.client.get(f"/lotes-produccion/{propio['id']}", headers=operario).status_code == 200
    assert self.client.get(f"/lotes-produccion/{ajeno['id']}", headers=operario).status_code == 403
    assert self.client.get('/lotes-produccion/', headers=self.headers(self.admin)).json()['total'] == 2

def test_filtros_del_listado_de_lotes(escenario):
    self = escenario
    pan = self.crear_producto('Pan').json()['id']
    budin = self.crear_producto('Budín').json()['id']
    hace_10 = (date.today() - timedelta(days=10)).isoformat()
    self.crear_lote(pan, fecha_produccion=hace_10)
    self.crear_lote(budin)
    admin = self.headers(self.admin)
    assert self.client.get(f'/lotes-produccion/?producto_id={budin}', headers=admin).json()['total'] == 1
    desde = (date.today() - timedelta(days=2)).isoformat()
    assert self.client.get(f'/lotes-produccion/?fecha_desde={desde}', headers=admin).json()['total'] == 1
    assert self.client.get('/lotes-produccion/?buscar=bud', headers=admin).json()['total'] == 1
    invertido = self.client.get(f'/lotes-produccion/?fecha_desde={date.today()}&fecha_hasta={hace_10}', headers=admin)
    assert invertido.status_code == 400

def test_admin_modifica_y_da_de_baja_un_lote(escenario):
    self = escenario
    producto_id = self.crear_producto().json()['id']
    lote_id = self.crear_lote(producto_id).json()['id']
    admin = self.headers(self.admin)
    modificado = self.client.put(f'/lotes-produccion/{lote_id}', json={'cantidad': 30}, headers=admin)
    assert modificado.json()['cantidad'] == 30
    assert self.client.put(f'/lotes-produccion/{lote_id}', json={'cantidad': 1}, headers=self.headers(self.operario)).status_code == 403
    assert not self.client.delete(f'/lotes-produccion/{lote_id}', headers=admin).json()['activo']
    assert self.client.get('/lotes-produccion/', headers=admin).json()['total'] == 0


def test_historial_cerrado_no_permite_editar_ni_dar_de_baja(escenario):
    """CA del VSM: los lotes cerrados deben ser de solo lectura."""
    p=escenario.crear_producto().json()
    lote=escenario.crear_lote(p['id']).json()
    headers=escenario.headers(escenario.admin)
    cierre=escenario.client.post(f"/lotes-produccion/{lote['id']}/cerrar",headers=headers)
    assert cierre.status_code==200,cierre.text
    assert escenario.client.put(f"/lotes-produccion/{lote['id']}",json={'cantidad':20},headers=headers).status_code==400
    respuesta=escenario.client.delete(f"/lotes-produccion/{lote['id']}",headers=headers)
    assert respuesta.status_code==400, 'Un lote cerrado debe ser de solo lectura: no puede darse de baja.'
