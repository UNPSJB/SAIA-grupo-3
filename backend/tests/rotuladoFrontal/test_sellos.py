import pytest

from src.config import settings
from src.insumos.constants import TipoInsumo
from src.insumos.models import Insumo
from src.producto.models import Producto
from tests.rotuladoFrontal.utilidades import datos_editables, nueva_version

VALORES = {
    "harina": {"energia": 340, "carbohidratos": 72, "azucares_totales": 0.3, "azucares_anadidos": 0, "proteinas": 10,
               "grasas_totales": 1, "grasas_saturadas": 0.2, "grasas_trans": 0, "fibra": 2.7, "sodio": 2},
    "azucar": {"energia": 400, "carbohidratos": 100, "azucares_totales": 100, "azucares_anadidos": 100, "proteinas": 0,
               "grasas_totales": 0, "grasas_saturadas": 0, "grasas_trans": 0, "fibra": 0, "sodio": 0},
    "aceite": {"energia": 884, "carbohidratos": 0, "azucares_totales": 0, "azucares_anadidos": 0, "proteinas": 0,
               "grasas_totales": 100, "grasas_saturadas": 11, "grasas_trans": 0, "fibra": 0, "sodio": 0},
    "sal": {"energia": 0, "carbohidratos": 0, "azucares_totales": 0, "azucares_anadidos": 0, "proteinas": 0,
            "grasas_totales": 0, "grasas_saturadas": 0, "grasas_trans": 0, "fibra": 0, "sodio": 38700},
    "agua": {"energia": 0, "carbohidratos": 0, "azucares_totales": 0, "azucares_anadidos": 0, "proteinas": 0,
             "grasas_totales": 0, "grasas_saturadas": 0, "grasas_trans": 0, "fibra": 0, "sodio": 0},
}
GALLETITA = {"harina": 500, "azucar": 150, "aceite": 100, "sal": 10}
ENERGIA_100 = (500 * 3.4 + 150 * 4 + 100 * 8.84) * 100 / 700


@pytest.fixture
def con_valores(client, headers_administradora, ingredientes_rotulado):
    for clave, valores in VALORES.items():
        respuesta = client.put(
            f"/nutricion/insumos/{ingredientes_rotulado[clave].id}",
            headers=headers_administradora,
            json={"fuente": "bibliografia", "detalle_fuente": "Prueba", "valores": valores},
        )
        assert respuesta.status_code == 200, respuesta.text
    return ingredientes_rotulado


@pytest.fixture
def producto(client, headers_administradora, db_session, unidad_gramo, con_valores, parametros):
    def crear(nombre="Galletita dulce", cantidades=None, rendimiento=700, extra=()):
        prod = Producto(nombre=nombre, unidad_medida_id=unidad_gramo.id, activo=True)
        db_session.add(prod)
        db_session.commit()
        renglones = [
            {"insumo_id": con_valores[c].id, "tipo": "ingrediente", "cantidad": g, "unidad_medida_id": unidad_gramo.id}
            for c, g in (cantidades or GALLETITA).items()
        ] + list(extra)
        respuesta = client.post(
            "/recetas/",
            headers=headers_administradora,
            json={
                "producto_id": prod.id,
                "rendimiento_cantidad": rendimiento,
                "rendimiento_unidad_id": unidad_gramo.id,
                "porcion_cantidad": 30,
                "porcion_unidad_id": unidad_gramo.id,
                "renglones": renglones,
            },
        )
        assert respuesta.status_code == 200, respuesta.text
        return prod.id

    return crear


def evaluar(client, headers, producto_id, correcciones=()):
    respuesta = client.put(
        f"/rotulado-frontal/productos/{producto_id}/aplicabilidad",
        headers=headers,
        json={"envasado_ausencia_cliente": True, "tipo_producto": "solido", "correcciones": list(correcciones)},
    )
    assert respuesta.status_code == 200, respuesta.text
    return respuesta.json()


def calcular(client, headers, producto_id, codigo=200):
    respuesta = client.post(f"/rotulado-frontal/productos/{producto_id}/sellos", headers=headers)
    assert respuesta.status_code == codigo, respuesta.text
    return respuesta.json()


def detalle(calculo, sello):
    return [d for d in calculo["detalle"] if d["sello"] == sello]


def publicar_con(client, headers, cambiar):
    borrador = nueva_version(client, headers)
    datos = datos_editables(borrador)
    datos["fecha_vigencia"] = "2026-12-01"
    cambiar(datos)
    client.put(f"/rotulado-frontal/parametros/{borrador['id']}", headers=headers, json=datos)
    respuesta = client.post(f"/rotulado-frontal/parametros/{borrador['id']}/publicar", headers=headers)
    assert respuesta.status_code == 200, respuesta.text
    return respuesta.json()


def test_un_producto_por_encima_del_umbral_de_azucares_recibe_ese_sello(client, headers_administradora, producto):
    prod = producto()
    evaluar(client, headers_administradora, prod)

    calculo = calcular(client, headers_administradora, prod)["calculo"]
    azucares = detalle(calculo, "azucares")[0]

    assert azucares["evaluado"] is True and azucares["supera"] is True
    assert azucares["valor"] == pytest.approx(150 / 7 * 4 * 100 / ENERGIA_100)
    assert azucares["operacion"].startswith("21,43 g × 4 kcal/g × 100 ÷ 454,86 kcal = 18,84 %")
    assert azucares["datos"]["azucares_anadidos"] == pytest.approx(150 / 7)
    assert calculo["leyendas"] == ["EXCESO EN AZÚCARES", "EXCESO EN SODIO", "EXCESO EN CALORÍAS"]
    assert detalle(calculo, "grasas_totales")[0]["supera"] is False
    assert calculo["provisorio"] is False and calculo["base"] == "g"


def test_justo_en_el_umbral_respeta_la_comparacion_de_los_parametros(client, headers_administradora, producto):
    prod = producto()
    evaluar(client, headers_administradora, prod)
    valor = detalle(calcular(client, headers_administradora, prod)["calculo"], "azucares")[0]["valor"]

    def limite_exacto(comparacion):
        def cambiar(datos):
            datos["umbrales"][0]["limite"] = valor
            datos["umbrales"][0]["comparacion"] = comparacion
        return cambiar

    publicar_con(client, headers_administradora, limite_exacto("mayor_o_igual"))
    evaluar(client, headers_administradora, prod)
    igual_o_mayor = detalle(calcular(client, headers_administradora, prod)["calculo"], "azucares")[0]
    publicar_con(client, headers_administradora, limite_exacto("mayor"))
    evaluar(client, headers_administradora, prod)
    solo_mayor = detalle(calcular(client, headers_administradora, prod)["calculo"], "azucares")[0]

    assert igual_o_mayor["valor"] == igual_o_mayor["limite"] and igual_o_mayor["supera"] is True
    assert solo_mayor["valor"] == solo_mayor["limite"] and solo_mayor["supera"] is False
    assert solo_mayor["simbolo"] == ">"


def test_un_nutriente_que_el_producto_no_agrega_no_se_evalua(client, headers_administradora, producto):
    prod = producto(cantidades={"harina": 500, "azucar": 150, "aceite": 300, "sal": 10})
    evaluar(client, headers_administradora, prod, [{"hecho": "agrega_grasas", "valor": False, "motivo": "Prueba"}])

    calculo = calcular(client, headers_administradora, prod)["calculo"]
    grasas = detalle(calculo, "grasas_totales")[0]

    assert grasas["evaluado"] is False and "grasas añadidas" in grasas["motivo"]
    assert grasas["operacion"] is None
    assert "grasas_totales" not in calculo["sellos"]
    assert "agrega_grasas" not in calculo["hechos"]


def test_un_producto_exceptuado_no_calcula_sellos(client, headers_administradora, producto):
    prod = producto(nombre="Pan sin sal", cantidades={"harina": 500, "agua": 300})
    assert evaluar(client, headers_administradora, prod)["evaluacion"]["resultado"] == "exceptuado"

    rechazo = calcular(client, headers_administradora, prod, codigo=400)
    estado = client.get(f"/rotulado-frontal/productos/{prod}/sellos", headers=headers_administradora).json()

    assert "exceptuado" in rechazo["detail"]
    assert estado["puede_calcular"] is False and estado["calculo"] is None and estado["historial"] == []


def test_sin_evaluar_la_aplicabilidad_no_se_calcula(client, headers_administradora, producto):
    prod = producto()

    rechazo = calcular(client, headers_administradora, prod, codigo=400)

    assert "Primero evaluá" in rechazo["detail"]


def test_el_resultado_guarda_la_version_de_parametros_y_de_receta(client, headers_administradora, producto):
    prod = producto()
    evaluar(client, headers_administradora, prod)
    primero = calcular(client, headers_administradora, prod)["calculo"]

    publicar_con(client, headers_administradora, lambda datos: datos["umbrales"][1].update(limite=25))
    desactualizada = calcular(client, headers_administradora, prod, codigo=400)
    avisos = client.get(f"/rotulado-frontal/productos/{prod}/sellos", headers=headers_administradora).json()["avisos"]
    evaluar(client, headers_administradora, prod)
    segundo = calcular(client, headers_administradora, prod)
    historico = client.get(f"/rotulado-frontal/sellos/{primero['id']}", headers=headers_administradora).json()

    assert primero["conjunto"]["numero"] == 1 and primero["conjunto"]["fecha_vigencia"] == "2024-12-27"
    assert primero["version_receta"]["numero"] == 1
    assert "desactualizada" in desactualizada["detail"]
    assert any("versión 2" in aviso for aviso in avisos)
    assert segundo["calculo"]["conjunto"]["numero"] == 2
    assert "grasas_totales" in segundo["calculo"]["sellos"]
    assert historico["conjunto"]["numero"] == 1 and historico["sellos"] == primero["sellos"]
    assert [c["conjunto_numero"] for c in segundo["historial"]] == [2, 1]


def test_con_la_tabla_nutricional_incompleta_el_resultado_es_provisorio(
    client, headers_administradora, producto, db_session, unidad_gramo
):
    semillas = Insumo(nombre="Semillas", unidad_medida_id=unidad_gramo.id, tipo=TipoInsumo.INGREDIENTE, activo=True)
    db_session.add(semillas)
    db_session.commit()
    extra = [{"insumo_id": semillas.id, "tipo": "ingrediente", "cantidad": 20, "unidad_medida_id": unidad_gramo.id}]
    prod = producto(extra=extra)
    evaluar(client, headers_administradora, prod)

    calculo = calcular(client, headers_administradora, prod)["calculo"]

    assert calculo["provisorio"] is True
    assert any("Semillas" in f for f in calculo["faltantes"])
    assert detalle(calculo, "azucares")[0]["evaluado"] is False
    assert "Falta el valor" in detalle(calculo, "azucares")[0]["motivo"]


def test_un_cambio_en_la_receta_avisa_que_hay_que_recalcular(
    client, headers_administradora, producto, con_valores, unidad_gramo
):
    prod = producto()
    evaluar(client, headers_administradora, prod)
    calcular(client, headers_administradora, prod)
    client.patch(
        f"/nutricion/insumos/{con_valores['azucar'].id}/valores",
        headers=headers_administradora,
        json={"valores": {"energia": 390}},
    )

    estado = client.get(f"/rotulado-frontal/productos/{prod}/sellos", headers=headers_administradora).json()

    assert any("información nutricional cambió" in aviso for aviso in estado["avisos"])


def test_con_el_modulo_apagado_los_sellos_no_responden(client, headers_administradora, producto, monkeypatch):
    prod = producto()
    monkeypatch.setattr(settings, "ROTULADO_FRONTAL_ACTIVO", False)

    assert client.get(f"/rotulado-frontal/productos/{prod}/sellos", headers=headers_administradora).status_code == 503
    assert client.post(f"/rotulado-frontal/productos/{prod}/sellos", headers=headers_administradora).status_code == 503
