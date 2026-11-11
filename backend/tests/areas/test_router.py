from src.insumosQuimicos.models import InsumoQuimico, TipoQuimico


def _crear_quimico(db_session, unidad_medida, nombre="Lavandina"):
    quimico = InsumoQuimico(
        nombre=nombre,
        cantidad=10,
        tipo_quimico=TipoQuimico.DESINFECTANTE,
        unidad_medida_id=unidad_medida.id,
        activo=True,
    )
    db_session.add(quimico)
    db_session.commit()
    return quimico


def test_no_se_puede_cargar_un_quimico_como_ingrediente(client, db_session, headers_administradora, unidad_medida):
    _crear_quimico(db_session, unidad_medida)

    respuesta = client.post(
        "/insumos/",
        headers=headers_administradora,
        json={"nombre": "lavandina", "unidad_medida_id": unidad_medida.id},
    )

    assert respuesta.status_code == 400
    assert "insumo químico de limpieza" in respuesta.json()["detail"]


def test_no_se_puede_renombrar_un_ingrediente_como_un_quimico(
    client, db_session, headers_administradora, unidad_medida, insumo_activo
):
    _crear_quimico(db_session, unidad_medida)

    respuesta = client.put(
        f"/insumos/{insumo_activo.id}",
        headers=headers_administradora,
        json={"nombre": "Lavandina"},
    )

    assert respuesta.status_code == 400


def test_no_se_puede_cargar_un_ingrediente_como_quimico(client, headers_administradora, unidad_medida, insumo_activo):
    respuesta = client.post(
        "/insumos-quimicos/",
        headers=headers_administradora,
        json={
            "nombre": insumo_activo.nombre,
            "cantidad": 1,
            "tipo_quimico": "detergente",
            "unidad_medida_id": unidad_medida.id,
        },
    )

    assert respuesta.status_code == 400
    assert "ingrediente de producción" in respuesta.json()["detail"]


def test_una_tarea_de_limpieza_no_acepta_un_ingrediente(client, headers_administradora, insumo_activo):
    respuesta = client.post(
        "/tareas/",
        headers=headers_administradora,
        json={
            "nombre": "Limpiar mesada",
            "frecuencia": "diaria",
            "procedimiento": "Lavar y desinfectar",
            "insumos_quimicos": [{"insumo_quimico_id": insumo_activo.id + 500, "cantidad": 1}],
        },
    )

    assert respuesta.status_code == 400
    assert "Producción" in respuesta.json()["detail"]


def test_las_tareas_de_limpieza_siguen_funcionando(client, db_session, headers_administradora, unidad_medida):
    quimico = _crear_quimico(db_session, unidad_medida)

    respuesta = client.post(
        "/tareas/",
        headers=headers_administradora,
        json={
            "nombre": "Limpiar mesada",
            "frecuencia": "diaria",
            "procedimiento": "Lavar y desinfectar",
            "insumos_quimicos": [{"insumo_quimico_id": quimico.id, "cantidad": 1}],
        },
    )

    assert respuesta.status_code == 200, respuesta.text
    assert respuesta.json()["insumos_quimicos"][0]["insumo_quimico_id"] == quimico.id

