from src.exportacion.services import recolectar_todos
from src.insumos import services as insumo_services
from src.insumos.models import Insumo


def test_recolectar_todos_recorre_todas_las_paginas_y_reenvia_filtros():
    llamadas = []

    def listar_simulado(*, page: int, size: int, buscar: str = "", ordenar_por: str = "id"):
        llamadas.append((page, size, buscar, ordenar_por))
        paginas = {
            1: [f"item-{i}" for i in range(1, 4)],
            2: [f"item-{i}" for i in range(4, 7)],
            3: ["item-7"],
        }
        return {"items": paginas[page], "total": 7, "page": page, "size": size, "pages": 3}

    resultado = recolectar_todos(
        listar_simulado, buscar="harina", ordenar_por="nombre"
    )

    assert resultado == [f"item-{i}" for i in range(1, 8)]
    assert llamadas == [
        (1, 100, "harina", "nombre"),
        (2, 100, "harina", "nombre"),
        (3, 100, "harina", "nombre"),
    ]


def test_recolectar_todos_devuelve_lista_vacia_si_no_hay_resultados():
    llamadas = 0

    def listar_vacio(*, page: int, size: int):
        nonlocal llamadas
        llamadas += 1
        return {"items": [], "total": 0, "page": page, "size": size, "pages": 0}

    assert recolectar_todos(listar_vacio) == []
    assert llamadas == 1


def test_recolectar_todos_reutiliza_servicio_real_con_filtros_y_orden(
    db_session, unidad_medida
):
    db_session.add_all([
        Insumo(nombre="Azúcar", unidad_medida_id=unidad_medida.id, activo=True),
        Insumo(nombre="Harina 000", unidad_medida_id=unidad_medida.id, activo=True),
        Insumo(nombre="Sal fina", unidad_medida_id=unidad_medida.id, activo=False),
    ])
    db_session.commit()

    activos_desc = recolectar_todos(
        insumo_services.listar_insumos,
        db_session,
        mostrar_inactivos=False,
        ordenar_por="nombre",
        orden="desc",
    )
    assert [i.nombre for i in activos_desc] == ["Harina 000", "Azúcar"]

    todos = recolectar_todos(
        insumo_services.listar_insumos,
        db_session,
        mostrar_inactivos=True,
        ordenar_por="nombre",
        orden="asc",
    )
    assert [i.nombre for i in todos] == ["Azúcar", "Harina 000", "Sal fina"]