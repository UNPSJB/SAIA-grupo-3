import pytest
from datetime import date
from sqlalchemy import select
from src.insumosQuimicos.models import InsumoQuimico, TipoQuimico
from src.notificaciones.models import Notificacion
from src.consumoQuimico.services import eliminar_consumo
from tests.consumoQuimico.utilidades import HACE_5_DIAS, HACE_10_DIAS, HOY, registrar


def test_consumir_y_modificar_actualiza_stock_y_aviso(client, db_session, unidad_medida, admin_headers):
    q=InsumoQuimico(nombre='Químico HTTP',tipo_quimico=TipoQuimico.DETERGENTE,cantidad=10,stock_minimo=5,unidad_medida_id=unidad_medida.id,activo=True)
    db_session.add(q);db_session.commit()
    datos={'insumo_quimico_id':q.id,'cantidad_utilizada':5,'fecha':date.today().isoformat(),'tarea_limpieza':'Limpiar'}
    r=client.post('/consumo-quimico/',json=datos,headers=admin_headers)
    assert r.status_code==200,r.text
    db_session.refresh(q);assert q.cantidad==5
    aviso=db_session.scalar(select(Notificacion).where(Notificacion.clave==f'stock-bajo-quimico-{q.id}'))
    assert aviso and not aviso.resuelta
    r=client.put(f"/consumo-quimico/{r.json()['id']}",json={'cantidad_utilizada':1},headers=admin_headers)
    assert r.status_code==200,r.text
    db_session.refresh(q);db_session.refresh(aviso)
    assert q.cantidad==9 and aviso.resuelta


@pytest.fixture
def consumos(db_session, detergente, desinfectante):
    registrar(db_session, detergente, 1, tarea="Lavado de pisos", fecha=HACE_10_DIAS)
    registrar(db_session, detergente, 3, tarea="Limpieza de mesadas", fecha=HOY)
    registrar(db_session, desinfectante, 5, tarea="Desinfección de cámaras", fecha=HACE_5_DIAS)
    dado_de_baja = registrar(db_session, desinfectante, 7, tarea="Lavado de vajilla", fecha=HOY)
    eliminar_consumo(db_session, dado_de_baja.id)


def tareas(respuesta):
    return [item["tarea_limpieza"] for item in respuesta.json()["items"]]


def listar(client, headers, **params):
    return client.get("/consumo-quimico/", headers=headers, params=params)


def test_listado_muestra_solo_activos_ordenados_por_fecha_descendente(client, admin_headers, consumos):
    respuesta = listar(client, admin_headers)

    assert respuesta.status_code == 200
    assert tareas(respuesta) == ["Limpieza de mesadas", "Desinfección de cámaras", "Lavado de pisos"]
    assert respuesta.json()["total"] == 3


def test_listado_con_ver_dados_de_baja(client, admin_headers, consumos):
    respuesta = listar(client, admin_headers, mostrar_inactivos=True)

    assert respuesta.json()["total"] == 4
    assert "Lavado de vajilla" in tareas(respuesta)


def test_listado_busca_por_tarea_o_por_nombre_del_insumo(client, admin_headers, consumos):
    assert tareas(listar(client, admin_headers, buscar="pisos")) == ["Lavado de pisos"]
    assert tareas(listar(client, admin_headers, buscar="DESINFECTANTE")) == ["Desinfección de cámaras"]
    assert tareas(listar(client, admin_headers, buscar="vajilla")) == []
    assert tareas(listar(client, admin_headers, buscar="vajilla", mostrar_inactivos=True)) == ["Lavado de vajilla"]


def test_listado_ordena_por_cantidad(client, admin_headers, consumos):
    respuesta = listar(client, admin_headers, ordenar_por="cantidad_utilizada", orden="asc")

    assert [item["cantidad_utilizada"] for item in respuesta.json()["items"]] == [1, 3, 5]


def test_listado_con_orden_invalido_devuelve_422(client, admin_headers, consumos):
    assert listar(client, admin_headers, ordenar_por="clave").status_code == 422


def reporte(client, headers, **params):
    return client.get("/consumo-quimico/reporte/acumulado", headers=headers, params=params)


def totales(respuesta):
    return {fila["nombre_insumo"]: fila["cantidad_total"] for fila in respuesta.json()}


def test_reporte_acumulado_sin_filtros(client, admin_headers, consumos):
    respuesta = reporte(client, admin_headers)

    assert respuesta.status_code == 200
    assert totales(respuesta) == {"Desinfectante": 5, "Detergente": 4}


@pytest.mark.parametrize(
    "params, esperado",
    [
        ({"fecha_desde": HACE_5_DIAS.isoformat()}, {"Desinfectante": 5, "Detergente": 3}),
        ({"fecha_hasta": HACE_5_DIAS.isoformat()}, {"Desinfectante": 5, "Detergente": 1}),
        ({"fecha_desde": HOY.isoformat(), "fecha_hasta": HOY.isoformat()}, {"Detergente": 3}),
    ],
)
def test_reporte_acumulado_con_filtros_de_fecha(client, admin_headers, consumos, params, esperado):
    respuesta = reporte(client, admin_headers, **params)

    assert respuesta.status_code == 200
    assert totales(respuesta) == esperado


def test_reporte_acumulado_con_fecha_invalida_devuelve_422(client, admin_headers):
    assert reporte(client, admin_headers, fecha_desde="no-es-fecha").status_code == 422


def test_registrar_cantidad_negativa_devuelve_422(client, admin_headers, detergente, db_session):
    datos = {
        "insumo_quimico_id": detergente.id,
        "cantidad_utilizada": -1,
        "fecha": HOY.isoformat(),
        "tarea_limpieza": "Limpieza de mesadas",
    }

    respuesta = client.post("/consumo-quimico/", headers=admin_headers, json=datos)

    assert respuesta.status_code == 422
    db_session.refresh(detergente)
    assert detergente.cantidad == 10


def test_modificar_a_cantidad_negativa_devuelve_422(client, admin_headers, db_session, detergente):
    consumo = registrar(db_session, detergente, 4)

    respuesta = client.put(f"/consumo-quimico/{consumo.id}", headers=admin_headers, json={"cantidad_utilizada": -2})

    assert respuesta.status_code == 422
    db_session.refresh(detergente)
    assert detergente.cantidad == 6
