import pytest

from src.aditivoReferencia.models import AditivoReferencia
from src.claseFuncional.models import ClaseFuncional
from src.insumos.constants import TipoInsumo
from src.insumos.models import Insumo
from src.unidadMedida.models import TipoUnidadMedida, UnidadMedida


@pytest.fixture
def gramos(db_session):
    unidad = UnidadMedida(tipo=TipoUnidadMedida.PESO, sufijo="g", activo=True, factor_base=1)
    db_session.add(unidad)
    db_session.commit()
    return unidad


@pytest.fixture
def aditivos(db_session, gramos, conservante, sorbato):
    aromatizante = ClaseFuncional(nombre="Aromatizante", ins_opcional=True, declarar_solo_funcion=True, activo=True)
    db_session.add(aromatizante)
    db_session.flush()
    propionato = AditivoReferencia(clase_funcional_id=conservante.id, nombre="Propionato de calcio", ins="282", activo=True)
    vainilla = AditivoReferencia(clase_funcional_id=aromatizante.id, nombre="Aroma de vainilla", activo=True)
    db_session.add_all([propionato, vainilla])
    db_session.flush()

    def insumo(nombre, referencia):
        nuevo = Insumo(nombre=nombre, unidad_medida_id=gramos.id, tipo=TipoInsumo.ADITIVO, aditivo_referencia_id=referencia.id, activo=True)
        db_session.add(nuevo)
        return nuevo

    creados = {
        "sorbato": insumo("Sorbato en polvo", sorbato),
        "propionato": insumo("Propionato en polvo", propionato),
        "vainilla": insumo("Esencia de vainilla", vainilla),
    }
    db_session.commit()
    return creados


@pytest.fixture
def huevo(db_session, unidad_medida):
    insumo = Insumo(nombre="Huevo", unidad_medida_id=unidad_medida.id, activo=True, denominacion_rotulo="huevo pasteurizado")
    db_session.add(insumo)
    db_session.commit()
    return insumo


def renglon(insumo, cantidad, unidad, tipo="ingrediente"):
    return {"insumo_id": insumo.id, "tipo": tipo, "cantidad": cantidad, "unidad_medida_id": unidad.id}


@pytest.fixture
def receta(client, headers_administradora, datos_receta, insumo_activo, otro_insumo_activo, huevo, aditivos, gramos):
    renglones = [
        renglon(otro_insumo_activo, 200, gramos),
        renglon(huevo, 200, gramos),
        renglon(insumo_activo, 500, gramos),
        renglon(aditivos["vainilla"], 5, gramos, "aditivo"),
        renglon(aditivos["sorbato"], 2, gramos, "aditivo"),
        renglon(aditivos["propionato"], 3, gramos, "aditivo"),
    ]
    respuesta = client.post("/recetas/", headers=headers_administradora, json=datos_receta(renglones=renglones))
    assert respuesta.status_code == 200, respuesta.text
    return respuesta.json()


def lista(client, headers, version_id):
    respuesta = client.get(f"/recetas/versiones/{version_id}/lista-ingredientes", headers=headers)
    assert respuesta.status_code == 200, respuesta.text
    return respuesta.json()


def formato(client, headers, valor):
    respuesta = client.put("/configuracion-produccion", headers=headers, json={"formato_aditivos": valor})
    assert respuesta.status_code == 200, respuesta.text


def test_ordena_de_mayor_a_menor_y_agrupa_aditivos_por_funcion(client, headers_administradora, receta):
    datos = lista(client, headers_administradora, receta["version_vigente"]["id"])

    assert [i["denominacion"] for i in datos["ingredientes"]] == ["Harina", "Azúcar", "huevo pasteurizado"]
    assert [g["clase_funcional"]["nombre"] for g in datos["grupos_aditivos"]] == ["Aromatizante", "Conservante"]
    assert [a["nombre"] for a in datos["grupos_aditivos"][1]["aditivos"]] == ["Propionato de calcio", "Sorbato de potasio"]
    assert datos["texto"] == (
        "Ingredientes: Harina, Azúcar, huevo pasteurizado, aromatizante, "
        "conservante: Propionato de calcio (INS 282), Sorbato de potasio (INS 202)."
    )


def test_con_porcentajes_iguales_el_orden_es_estable(client, headers_administradora, receta):
    primera = lista(client, headers_administradora, receta["version_vigente"]["id"])
    segunda = lista(client, headers_administradora, receta["version_vigente"]["id"])

    assert primera["hay_empates"] is True
    assert [i["denominacion"] for i in primera["ingredientes"]][1:] == ["Azúcar", "huevo pasteurizado"]
    assert primera["ingredientes"] == segunda["ingredientes"]


def test_el_aromatizante_aparece_solo_por_su_funcion(client, headers_administradora, receta):
    grupos = lista(client, headers_administradora, receta["version_vigente"]["id"])["grupos_aditivos"]

    assert grupos[0]["solo_funcion"] is True
    assert grupos[0]["declaracion"] == "aromatizante"


@pytest.mark.parametrize(
    ("valor", "esperado"),
    [
        ("funcion_nombre", "conservante: Propionato de calcio, Sorbato de potasio"),
        ("funcion_ins", "conservante: INS 282, INS 202"),
        ("funcion_nombre_ins", "conservante: Propionato de calcio (INS 282), Sorbato de potasio (INS 202)"),
    ],
)
def test_cada_formato_arma_el_texto_correcto(client, headers_administradora, receta, valor, esperado):
    formato(client, headers_administradora, valor)

    datos = lista(client, headers_administradora, receta["version_vigente"]["id"])

    assert datos["formato"] == valor
    assert datos["grupos_aditivos"][1]["declaracion"] == esperado
    assert esperado in datos["texto"]


def test_un_ajuste_manual_queda_registrado(client, headers_administradora, receta, persona_administradora):
    version_id = receta["version_vigente"]["id"]
    automatica = lista(client, headers_administradora, version_id)
    harina, azucar, huevo = [i["renglon_id"] for i in automatica["ingredientes"]]

    respuesta = client.put(
        f"/recetas/versiones/{version_id}/orden-ingredientes",
        headers=headers_administradora,
        json={"renglon_ids": [harina, huevo, azucar]},
    )

    assert respuesta.status_code == 200, respuesta.text
    manual = respuesta.json()
    assert [i["denominacion"] for i in manual["ingredientes"]] == ["Harina", "huevo pasteurizado", "Azúcar"]
    assert manual["manual"] is True
    assert manual["ajustado_por"]["id"] == persona_administradora.id
    assert manual["ajustado_en"] is not None
    assert not any(i["fuera_de_orden"] for i in manual["ingredientes"])


def test_un_orden_manual_que_rompe_el_orden_decreciente_se_marca(client, headers_administradora, receta):
    version_id = receta["version_vigente"]["id"]
    harina, azucar, huevo = [i["renglon_id"] for i in lista(client, headers_administradora, version_id)["ingredientes"]]

    manual = client.put(
        f"/recetas/versiones/{version_id}/orden-ingredientes",
        headers=headers_administradora,
        json={"renglon_ids": [azucar, harina, huevo]},
    ).json()

    assert [i["fuera_de_orden"] for i in manual["ingredientes"]] == [False, True, False]


def test_volver_al_orden_automatico(client, headers_administradora, receta):
    version_id = receta["version_vigente"]["id"]
    harina, azucar, huevo = [i["renglon_id"] for i in lista(client, headers_administradora, version_id)["ingredientes"]]
    client.put(
        f"/recetas/versiones/{version_id}/orden-ingredientes",
        headers=headers_administradora,
        json={"renglon_ids": [harina, huevo, azucar]},
    )

    respuesta = client.delete(f"/recetas/versiones/{version_id}/orden-ingredientes", headers=headers_administradora)

    assert respuesta.json()["manual"] is False
    assert [i["renglon_id"] for i in respuesta.json()["ingredientes"]] == [harina, azucar, huevo]


def test_el_orden_manual_debe_incluir_todos_los_ingredientes(client, headers_administradora, receta):
    version_id = receta["version_vigente"]["id"]
    ids = [i["renglon_id"] for i in lista(client, headers_administradora, version_id)["ingredientes"]]

    respuesta = client.put(
        f"/recetas/versiones/{version_id}/orden-ingredientes",
        headers=headers_administradora,
        json={"renglon_ids": ids[:2]},
    )

    assert respuesta.status_code == 400


def _nueva_version(client, headers, receta, renglones):
    datos = {
        "rendimiento_cantidad": 1,
        "rendimiento_unidad_id": renglones[0]["unidad_medida_id"],
        "renglones": renglones,
        "version_base_id": receta["version_vigente"]["id"],
        "motivo": "Cambio",
    }
    return client.post(f"/recetas/{receta['id']}/versiones", headers=headers, json=datos).json()


def _renglones_de(receta):
    return [
        {
            "insumo_id": r["insumo"]["id"],
            "tipo": r["tipo"],
            "cantidad": r["cantidad"],
            "unidad_medida_id": r["unidad_medida"]["id"],
        }
        for r in receta["version_vigente"]["renglones"]
    ]


def test_version_nueva_con_otros_porcentajes_vuelve_al_orden_automatico_y_avisa(
    client, headers_administradora, receta
):
    version_id = receta["version_vigente"]["id"]
    harina, azucar, huevo = [i["renglon_id"] for i in lista(client, headers_administradora, version_id)["ingredientes"]]
    client.put(
        f"/recetas/versiones/{version_id}/orden-ingredientes",
        headers=headers_administradora,
        json={"renglon_ids": [harina, huevo, azucar]},
    )
    renglones = _renglones_de(receta)
    renglones[0]["cantidad"] = 100

    nueva = _nueva_version(client, headers_administradora, receta, renglones)
    datos = lista(client, headers_administradora, nueva["version_vigente"]["id"])

    assert datos["manual"] is False
    assert datos["aviso_orden_anterior"] is True


def test_version_nueva_con_los_mismos_porcentajes_conserva_el_orden_manual(
    client, headers_administradora, receta
):
    version_id = receta["version_vigente"]["id"]
    harina, azucar, huevo = [i["renglon_id"] for i in lista(client, headers_administradora, version_id)["ingredientes"]]
    client.put(
        f"/recetas/versiones/{version_id}/orden-ingredientes",
        headers=headers_administradora,
        json={"renglon_ids": [harina, huevo, azucar]},
    )

    nueva = _nueva_version(client, headers_administradora, receta, _renglones_de(receta))
    datos = lista(client, headers_administradora, nueva["version_vigente"]["id"])

    assert datos["manual"] is True
    assert [i["denominacion"] for i in datos["ingredientes"]] == ["Harina", "huevo pasteurizado", "Azúcar"]


def test_no_se_ajusta_el_orden_de_una_version_archivada(client, headers_administradora, receta):
    version_id = receta["version_vigente"]["id"]
    ids = [i["renglon_id"] for i in lista(client, headers_administradora, version_id)["ingredientes"]]
    _nueva_version(client, headers_administradora, receta, _renglones_de(receta))

    respuesta = client.put(
        f"/recetas/versiones/{version_id}/orden-ingredientes",
        headers=headers_administradora,
        json={"renglon_ids": ids},
    )

    assert respuesta.status_code == 400
    assert "solo lectura" in respuesta.json()["detail"]


def test_operario_no_ve_la_lista(client, headers_operadora, receta):
    respuesta = client.get(
        f"/recetas/versiones/{receta['version_vigente']['id']}/lista-ingredientes", headers=headers_operadora
    )

    assert respuesta.status_code == 403
