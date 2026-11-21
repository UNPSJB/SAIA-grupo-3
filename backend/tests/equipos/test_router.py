import pytest

from src.sector.constants import ErrorCode as SectorErrorCode


@pytest.mark.parametrize('minima,maxima', [(8,2),(2,2),(None,8),(2,None)])
def test_rechaza_rango_invalido(client, admin_headers, equipo_frio, minima, maxima):
    datos = {'nombre':'Equipo inválido','numero_serie':'INVALIDO','tipo':'equipo','sector_id':equipo_frio.sector_id,'controla_temperatura':True,'temperatura_minima':minima,'temperatura_maxima':maxima}
    assert client.post('/equipos/', json=datos, headers=admin_headers).status_code == 422


def test_configurar_control_y_validar_edicion_parcial(client, admin_headers, equipo_frio):
    respuesta = client.put(f'/equipos/{equipo_frio.id}', json={'temperatura_minima':3}, headers=admin_headers)
    assert respuesta.status_code == 200 and respuesta.json()['temperatura_minima'] == 3
    assert client.put(f'/equipos/{equipo_frio.id}', json={'temperatura_minima':20}, headers=admin_headers).status_code == 422
    assert client.get(f'/equipos/{equipo_frio.id}', headers=admin_headers).json()['temperatura_minima'] == 3


def nombres(respuesta):
    return [item["nombre"] for item in respuesta.json()["items"]]


@pytest.fixture
def sectores(sector_cocina, sector_panaderia, sector_inactivo):
    return sector_cocina, sector_panaderia, sector_inactivo


@pytest.fixture
def equipos(equipo_balanza, equipo_horno, equipo_dado_de_baja):
    return equipo_balanza, equipo_horno, equipo_dado_de_baja


def test_listar_sectores_muestra_solo_activos(client, admin_headers, sectores):
    respuesta = client.get("/sectores/", headers=admin_headers)

    assert respuesta.status_code == 200
    assert nombres(respuesta) == ["Cocina", "Panadería"]
    assert respuesta.json()["total"] == 2


def test_listar_sectores_con_ver_dados_de_baja(client, admin_headers, sectores):
    respuesta = client.get("/sectores/", headers=admin_headers, params={"mostrar_inactivos": True})

    assert nombres(respuesta) == ["Cocina", "Panadería", "Depósito viejo"]
    assert respuesta.json()["total"] == 3


def test_buscar_sectores_por_nombre(client, admin_headers, sectores):
    def buscar(**params):
        return nombres(client.get("/sectores/", headers=admin_headers, params=params))

    assert buscar(buscar="PANA") == ["Panadería"]
    assert buscar(buscar="viejo") == []
    assert buscar(buscar="viejo", mostrar_inactivos=True) == ["Depósito viejo"]


def test_ordenar_sectores_por_nombre_descendente(client, admin_headers, sectores):
    respuesta = client.get("/sectores/", headers=admin_headers, params={"ordenar_por": "nombre", "orden": "desc"})

    assert nombres(respuesta) == ["Panadería", "Cocina"]


@pytest.mark.parametrize("params", [{"ordenar_por": "clave"}, {"orden": "al-reves"}])
def test_orden_invalido_devuelve_422(client, admin_headers, params):
    respuesta = client.get("/sectores/", headers=admin_headers, params=params)

    assert respuesta.status_code == 422


def test_listar_equipos_muestra_solo_activos(client, admin_headers, equipos):
    respuesta = client.get("/equipos/", headers=admin_headers)

    assert respuesta.status_code == 200
    assert nombres(respuesta) == ["Balanza", "Horno"]


def test_listar_equipos_con_ver_dados_de_baja(client, admin_headers, equipos):
    respuesta = client.get("/equipos/", headers=admin_headers, params={"mostrar_inactivos": True})

    assert nombres(respuesta) == ["Balanza", "Horno", "Freidora"]


def test_buscar_equipos_por_nombre_o_numero_de_serie(client, admin_headers, equipos):
    def buscar(**params):
        return nombres(client.get("/equipos/", headers=admin_headers, params=params))

    assert buscar(buscar="hor") == ["Horno"]
    assert buscar(buscar="bal-0") == ["Balanza"]
    assert buscar(buscar="fre") == []
    assert buscar(buscar="fre", mostrar_inactivos=True) == ["Freidora"]


def test_ordenar_equipos_por_numero_de_serie_descendente(client, admin_headers, equipos):
    respuesta = client.get("/equipos/", headers=admin_headers, params={"ordenar_por": "numero_serie", "orden": "desc"})

    assert nombres(respuesta) == ["Horno", "Balanza"]


def test_detalle_del_sector_muestra_solo_sus_equipos_activos(client, admin_headers, sector_cocina, equipos):
    respuesta = client.get(f"/sectores/{sector_cocina.id}", headers=admin_headers)

    assert respuesta.status_code == 200
    assert respuesta.json()["nombre"] == "Cocina"
    assert [equipo["numero_serie"] for equipo in respuesta.json()["equipos"]] == ["BAL-001"]


def test_detalle_de_sector_dado_de_baja_devuelve_404(client, admin_headers, sector_inactivo):
    respuesta = client.get(f"/sectores/{sector_inactivo.id}", headers=admin_headers)

    assert respuesta.status_code == 404


def test_crear_sector_duplicado_devuelve_400(client, admin_headers, sector_cocina):
    respuesta = client.post("/sectores/", headers=admin_headers, json={"nombre": "COCINA"})

    assert respuesta.status_code == 400
    assert respuesta.json()["detail"] == SectorErrorCode.NOMBRE_DUPLICADO


def test_dar_de_baja_sector_con_equipos_devuelve_400(client, admin_headers, sector_cocina, equipo_balanza):
    respuesta = client.delete(f"/sectores/{sector_cocina.id}", headers=admin_headers)

    assert respuesta.status_code == 400
    assert respuesta.json()["detail"] == SectorErrorCode.SECTOR_TIENE_EQUIPOS


def test_crear_equipo_con_tipo_invalido_devuelve_422(client, admin_headers, sector_cocina):
    datos = {"numero_serie": "LIC-001", "nombre": "Licuadora", "tipo": "maquina", "sector_id": sector_cocina.id}

    respuesta = client.post("/equipos/", headers=admin_headers, json=datos)

    assert respuesta.status_code == 422


def test_reactivar_equipo_dado_de_baja(client, admin_headers, equipo_balanza):
    equipo_id = equipo_balanza.id

    baja = client.delete(f"/equipos/{equipo_id}", headers=admin_headers)
    assert baja.json()["activo"] is False
    assert client.get(f"/equipos/{equipo_id}", headers=admin_headers).status_code == 404

    respuesta = client.put(f"/equipos/{equipo_id}", headers=admin_headers, json={"activo": True})

    assert respuesta.status_code == 200
    assert respuesta.json()["activo"] is True
    assert client.get(f"/equipos/{equipo_id}", headers=admin_headers).status_code == 200
    assert nombres(client.get("/equipos/", headers=admin_headers)) == ["Balanza"]
