import pytest

from src.nutricion.models import AlimentoReferencia

CSV_DEMO = (
    "codigo;nombre;grupo;energia_kcal;carbohidratos_g;azucares_totales_g;proteinas_g;grasas_totales_g;sodio_mg\n"
    "A-1;Azúcar;Dulces;400;100;100;0;0;0\n"
    "A-2;Sal fina;Varios;0;0;0;0;0;38758\n"
)


def datos(client, headers, insumo_id):
    respuesta = client.get(f"/nutricion/insumos/{insumo_id}", headers=headers)
    assert respuesta.status_code == 200, respuesta.text
    return respuesta.json()


def por_nutriente(datos_insumo):
    return {valor["nutriente"]: valor for valor in datos_insumo["valores"]}


def copiar(client, headers, insumo_id, alimento_id):
    return client.post(
        f"/nutricion/insumos/{insumo_id}/copiar-referencia",
        headers=headers,
        json={"alimento_referencia_id": alimento_id},
    )


def test_copiar_desde_la_base_registra_fuente_y_fecha(
    client, headers_administradora, insumo_activo, harina_referencia, persona_administradora
):
    respuesta = copiar(client, headers_administradora, insumo_activo.id, harina_referencia.id)

    assert respuesta.status_code == 200, respuesta.text
    valores = por_nutriente(respuesta.json())
    energia = valores["energia"]
    assert energia["valor"] == 340
    assert energia["fuente"] == "base_referencia"
    assert energia["alimento_referencia"]["codigo"] == "DEMO-001"
    assert energia["cargado_por"]["id"] == persona_administradora.id
    assert energia["cargado_en"] is not None
    assert energia["modificado"] is False
    assert respuesta.json()["energia_kj"] == 1428.0
    assert respuesta.json()["faltantes"] == ["azucares_anadidos"]


def test_cambiar_un_valor_copiado_lo_marca_como_modificado(
    client, headers_administradora, insumo_activo, harina_referencia, persona_administradora
):
    copiar(client, headers_administradora, insumo_activo.id, harina_referencia.id)

    respuesta = client.patch(
        f"/nutricion/insumos/{insumo_activo.id}/valores",
        headers=headers_administradora,
        json={"valores": {"proteinas": 11.5}},
    )

    assert respuesta.status_code == 200, respuesta.text
    proteinas = por_nutriente(respuesta.json())["proteinas"]
    assert (proteinas["valor"], proteinas["valor_fuente"]) == (11.5, 10)
    assert proteinas["modificado"] is True
    assert proteinas["modificado_por"]["id"] == persona_administradora.id
    assert proteinas["fuente"] == "base_referencia"


def test_volver_al_valor_de_la_fuente_quita_la_marca(client, headers_administradora, insumo_activo, harina_referencia):
    copiar(client, headers_administradora, insumo_activo.id, harina_referencia.id)
    url = f"/nutricion/insumos/{insumo_activo.id}/valores"
    client.patch(url, headers=headers_administradora, json={"valores": {"proteinas": 11.5}})

    respuesta = client.patch(url, headers=headers_administradora, json={"valores": {"proteinas": 10}})

    assert por_nutriente(respuesta.json())["proteinas"]["modificado"] is False


def test_carga_manual_desde_el_rotulo_del_proveedor(client, headers_administradora, otro_insumo_activo):
    respuesta = client.put(
        f"/nutricion/insumos/{otro_insumo_activo.id}",
        headers=headers_administradora,
        json={
            "fuente": "rotulo_proveedor",
            "detalle_fuente": " Rótulo Azucarera X, lote 2026 ",
            "valores": {"energia": 400, "carbohidratos": 100, "azucares_totales": 100, "azucares_anadidos": 0},
        },
    )

    assert respuesta.status_code == 200, respuesta.text
    energia = por_nutriente(respuesta.json())["energia"]
    assert (energia["fuente"], energia["detalle_fuente"]) == ("rotulo_proveedor", "Rótulo Azucarera X, lote 2026")


@pytest.mark.parametrize(
    ("valores", "codigo"),
    [
        ({"energia": -1}, 422),
        ({"carbohidratos": 10, "azucares_totales": 12}, 400),
        ({"azucares_totales": 5, "azucares_anadidos": 6}, 400),
        ({"grasas_totales": 10, "grasas_saturadas": 7, "grasas_trans": 4}, 400),
    ],
)
def test_rechaza_valores_negativos_o_incoherentes(client, headers_administradora, insumo_activo, valores, codigo):
    respuesta = client.put(
        f"/nutricion/insumos/{insumo_activo.id}",
        headers=headers_administradora,
        json={"fuente": "valor_propio", "valores": valores},
    )

    assert respuesta.status_code == codigo


def test_una_modificacion_incoherente_tambien_se_rechaza(client, headers_administradora, insumo_activo, harina_referencia):
    copiar(client, headers_administradora, insumo_activo.id, harina_referencia.id)

    respuesta = client.patch(
        f"/nutricion/insumos/{insumo_activo.id}/valores",
        headers=headers_administradora,
        json={"valores": {"azucares_totales": 80}},
    )

    assert respuesta.status_code == 400
    assert "carbohidratos" in respuesta.json()["detail"]


def test_un_aditivo_sin_la_marca_no_acepta_energia_ni_sodio(client, headers_administradora, aditivo, harina_referencia):
    carga = client.put(
        f"/nutricion/insumos/{aditivo.id}",
        headers=headers_administradora,
        json={"fuente": "bibliografia", "valores": {"sodio": 27360}},
    )
    copia = copiar(client, headers_administradora, aditivo.id, harina_referencia.id)

    assert carga.status_code == 400
    assert "aporte" in carga.json()["detail"]
    assert copia.status_code == 400
    assert datos(client, headers_administradora, aditivo.id)["nutrientes"] == []


def test_un_aditivo_con_la_marca_acepta_solo_energia_y_sodio(
    client, db_session, headers_administradora, aditivo, harina_referencia
):
    aditivo.aporta_energia_sodio = True
    db_session.commit()

    con_proteinas = client.put(
        f"/nutricion/insumos/{aditivo.id}",
        headers=headers_administradora,
        json={"fuente": "bibliografia", "valores": {"proteinas": 1}},
    )
    copia = copiar(client, headers_administradora, aditivo.id, harina_referencia.id)

    assert con_proteinas.status_code == 400
    assert copia.status_code == 200
    assert sorted(por_nutriente(copia.json())) == ["energia", "sodio"]


def test_historial_de_cambios(client, headers_administradora, insumo_activo, harina_referencia):
    copiar(client, headers_administradora, insumo_activo.id, harina_referencia.id)
    client.patch(
        f"/nutricion/insumos/{insumo_activo.id}/valores",
        headers=headers_administradora,
        json={"valores": {"sodio": 5}},
    )
    client.put(
        f"/nutricion/insumos/{insumo_activo.id}",
        headers=headers_administradora,
        json={"fuente": "valor_propio", "valores": {"fibra": None}},
    )

    historial = client.get(f"/nutricion/insumos/{insumo_activo.id}/historial", headers=headers_administradora).json()

    acciones = [(m["accion"], m["nutriente"]) for m in historial[:2]]
    assert acciones == [("borrado", "fibra"), ("modificacion", "sodio")]
    assert sum(1 for m in historial if m["accion"] == "copia_referencia") == 9
    sodio = next(m for m in historial if m["accion"] == "modificacion")
    assert (sodio["valor_anterior"], sodio["valor_nuevo"]) == (2, 5)


def test_volver_a_importar_no_duplica_alimentos(client, db_session, headers_administradora):
    def importar(contenido):
        return client.post(
            "/nutricion/alimentos/importar",
            headers=headers_administradora,
            data={"fuente": "Prueba"},
            files={"archivo": ("tabla.csv", contenido.encode(), "text/csv")},
        ).json()

    primera = importar(CSV_DEMO)
    segunda = importar(CSV_DEMO)
    tercera = importar(CSV_DEMO.replace("38758", "38000"))

    assert (primera["creados"], primera["actualizados"], primera["sin_cambios"]) == (2, 0, 0)
    assert (segunda["creados"], segunda["sin_cambios"]) == (0, 2)
    assert tercera["actualizados"] == 1
    assert db_session.query(AlimentoReferencia).count() == 2


def test_importar_informa_filas_con_errores(client, headers_administradora):
    contenido = "codigo,nombre,energia_kcal\nB-1,Bien,100\n,Sin código,10\nB-3,Mal,abc\n"

    resultado = client.post(
        "/nutricion/alimentos/importar",
        headers=headers_administradora,
        data={"fuente": "Prueba"},
        files={"archivo": ("tabla.csv", contenido.encode(), "text/csv")},
    ).json()

    assert resultado["creados"] == 1
    assert len(resultado["errores"]) == 2


def test_buscar_alimentos(client, headers_administradora, harina_referencia):
    encontrados = client.get("/nutricion/alimentos?buscar=harina", headers=headers_administradora).json()

    assert [a["codigo"] for a in encontrados] == ["DEMO-001"]
    assert client.get("/nutricion/alimentos?buscar=zzz", headers=headers_administradora).json() == []


def test_solo_administracion(client, headers_operadora, insumo_activo):
    assert client.get(f"/nutricion/insumos/{insumo_activo.id}", headers=headers_operadora).status_code == 403


def test_la_marca_de_aporte_se_guarda_desde_el_insumo_y_solo_en_aditivos(
    client, headers_administradora, aditivo, insumo_activo
):
    marcado = client.put(
        f"/insumos/{aditivo.id}", headers=headers_administradora, json={"aporta_energia_sodio": True}
    )
    ingrediente = client.put(
        f"/insumos/{insumo_activo.id}", headers=headers_administradora, json={"aporta_energia_sodio": True}
    )

    assert marcado.status_code == 200, marcado.text
    assert marcado.json()["aporta_energia_sodio"] is True
    assert [n["nutriente"] for n in datos(client, headers_administradora, aditivo.id)["nutrientes"]] == ["energia", "sodio"]
    assert ingrediente.json()["aporta_energia_sodio"] is False


def test_volver_a_copiar_el_mismo_alimento_no_repite_el_historial(
    client, headers_administradora, insumo_activo, harina_referencia
):
    copiar(client, headers_administradora, insumo_activo.id, harina_referencia.id)
    client.patch(
        f"/nutricion/insumos/{insumo_activo.id}/valores",
        headers=headers_administradora,
        json={"valores": {"sodio": 5}},
    )
    copiar(client, headers_administradora, insumo_activo.id, harina_referencia.id)

    historial = client.get(f"/nutricion/insumos/{insumo_activo.id}/historial", headers=headers_administradora).json()
    sodio = por_nutriente(datos(client, headers_administradora, insumo_activo.id))["sodio"]

    assert len(historial) == 11
    assert historial[0]["accion"] == "copia_referencia" and historial[0]["nutriente"] == "sodio"
    assert sodio["valor"] == 2 and sodio["modificado"] is False
