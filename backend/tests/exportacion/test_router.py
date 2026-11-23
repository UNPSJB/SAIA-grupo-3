import pytest

from src.insumos.models import Insumo
from src.sector.models import Sector


def test_exportacion_devuelve_todos_los_registros_sin_paginar_y_respeta_orden_y_filtros(
    client, db_session, headers_administradora, unidad_medida
):
    # Creamos 15 insumos activos y 1 inactivo (supera el tamaño de página por defecto = 10)
    insumos = [
        Insumo(
            nombre=f"Harina {i:02d}",
            unidad_medida_id=unidad_medida.id,
            stock_minimo=5.0 if i <= 3 else None,
            activo=True,
        )
        for i in range(1, 16)
    ]
    insumos.append(
        Insumo(nombre="Harina Inactiva", unidad_medida_id=unidad_medida.id, activo=False)
    )
    db_session.add_all(insumos)
    db_session.commit()

    # Trae los 15 activos completos ordenados descendentemente
    res_desc = client.get(
        "/exportacion/insumos",
        headers=headers_administradora,
        params={"ordenar_por": "nombre", "orden": "desc"},
    )
    assert res_desc.status_code == 200, res_desc.text
    nombres_desc = [item["nombre"] for item in res_desc.json()]
    assert len(nombres_desc) == 15
    assert nombres_desc[0] == "Harina 15"
    assert nombres_desc[-1] == "Harina 01"

    # Respeta mostrar_inactivos
    res_todos = client.get(
        "/exportacion/insumos",
        headers=headers_administradora,
        params={"mostrar_inactivos": True},
    )
    assert res_todos.status_code == 200
    assert len(res_todos.json()) == 16

    # Respeta búsqueda y filtro solo_stock_bajo
    res_bajo = client.get(
        "/exportacion/insumos",
        headers=headers_administradora,
        params={"solo_stock_bajo": True, "ordenar_por": "nombre", "orden": "asc"},
    )
    assert res_bajo.status_code == 200
    assert [item["nombre"] for item in res_bajo.json()] == [
        "Harina 01",
        "Harina 02",
        "Harina 03",
    ]


def test_exportacion_respeta_busqueda_en_catalogos(
    client, db_session, headers_administradora
):
    db_session.add_all([
        Sector(nombre="Cocina Caliente", activo=True),
        Sector(nombre="Panaderia", activo=True),
        Sector(nombre="Almacen", activo=True),
        Sector(nombre="Hornos", activo=True),
    ])
    db_session.commit()

    res = client.get(
        "/exportacion/sectores",
        headers=headers_administradora,
        params={"buscar": "a", "ordenar_por": "nombre", "orden": "asc"},
    )
    assert res.status_code == 200
    assert [s["nombre"] for s in res.json()] == [
        "Almacen",
        "Cocina Caliente",
        "Panaderia",
    ]


@pytest.mark.parametrize(
    "ruta",
    [
        "/exportacion/insumos",
        "/exportacion/incidentes",
        "/exportacion/lotes-produccion",
        "/exportacion/recetas",
        "/exportacion/personal",
        "/exportacion/vencimientos",
    ],
)
def test_exportacion_restringida_a_administradores(
    client, headers_operadora, headers_sin_permisos, ruta
):
    assert client.get(ruta).status_code == 401
    assert client.get(ruta, headers=headers_operadora).status_code == 403
    assert client.get(ruta, headers=headers_sin_permisos).status_code == 403


def test_exportacion_orden_invalido_devuelve_422(client, headers_administradora):
    res = client.get(
        "/exportacion/insumos",
        headers=headers_administradora,
        params={"ordenar_por": "columna_inexistente"},
    )
    assert res.status_code == 422