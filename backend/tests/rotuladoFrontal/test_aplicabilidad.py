from sqlalchemy import select

from src.config import settings
from src.producto.models import Producto
from src.receta.models import Receta
from tests.rotuladoFrontal.utilidades import datos_editables, nueva_version


def ruta(producto_id):
    return f"/rotulado-frontal/productos/{producto_id}/aplicabilidad"


def evaluar(client, headers, producto_id, envasado=True, correcciones=(), tipo="solido"):
    respuesta = client.put(
        ruta(producto_id),
        headers=headers,
        json={"envasado_ausencia_cliente": envasado, "tipo_producto": tipo, "correcciones": list(correcciones)},
    )
    assert respuesta.status_code == 200, respuesta.text
    return respuesta.json()


def agregados(estado):
    return {a["hecho"]: a for a in estado["agregados"]}


def test_si_no_se_vende_envasado_en_ausencia_del_cliente_no_corresponde(
    client, headers_administradora, producto_con_receta
):
    producto = producto_con_receta("Facturas", ["harina", "azucar", "aceite"])

    estado = evaluar(client, headers_administradora, producto, envasado=False)

    assert estado["evaluacion"]["resultado"] == "no_corresponde"
    assert "envasado en ausencia del cliente" in estado["evaluacion"]["mensaje"]
    assert estado["evaluacion"]["conjunto"]["numero"] == 1


def test_sin_agregados_ni_edulcorantes_ni_cafeina_queda_exceptuado(client, headers_administradora, producto_con_receta):
    producto = producto_con_receta("Pan sin sal", ["harina", "agua"])

    estado = evaluar(client, headers_administradora, producto)

    assert all(not a["sugerido"] and not a["valor"] for a in estado["agregados"])
    assert estado["evaluacion"]["resultado"] == "exceptuado"
    assert estado["evaluacion"]["hechos"] == ["envasado_ausencia_cliente"]


def test_los_agregados_se_sugieren_desde_la_receta_con_el_ingrediente_que_los_provoca(
    client, headers_administradora, producto_con_receta
):
    producto = producto_con_receta("Galletitas", ["harina", "azucar", "aceite", "sal"])

    estado = client.get(ruta(producto), headers=headers_administradora).json()
    sugeridos = agregados(estado)

    assert estado["evaluacion"] is None and estado["receta"]["numero"] == 1
    assert [c["nombre"] for c in sugeridos["agrega_azucares"]["causas"]] == ["Azúcar"]
    assert [c["nombre"] for c in sugeridos["agrega_grasas"]["causas"]] == ["Aceite"]
    assert [c["nombre"] for c in sugeridos["agrega_sodio"]["causas"]] == ["Sal"]
    assert sugeridos["contiene_cafeina"]["sugerido"] is False
    assert evaluar(client, headers_administradora, producto)["evaluacion"]["resultado"] == "corresponde"


def test_un_aditivo_edulcorante_marca_el_producto_como_con_edulcorantes(
    client, headers_administradora, producto_con_receta, edulcorante
):
    producto = producto_con_receta("Bizcochuelo light", ["harina", "agua"], aditivos=[edulcorante])

    estado = evaluar(client, headers_administradora, producto)
    con_edulcorantes = agregados(estado)["contiene_edulcorantes"]

    assert con_edulcorantes["sugerido"] is True
    assert con_edulcorantes["causas"] == [{"id": edulcorante.id, "nombre": "Sucralosa en polvo", "tipo": "aditivo"}]
    assert estado["evaluacion"]["resultado"] == "corresponde"
    assert "contiene_edulcorantes" in estado["evaluacion"]["hechos"]


def test_un_ingrediente_con_cafeina_marca_el_producto(client, headers_administradora, producto_con_receta):
    producto = producto_con_receta("Alfajor de café", ["harina", "cafe"])

    estado = evaluar(client, headers_administradora, producto)

    assert agregados(estado)["contiene_cafeina"]["valor"] is True
    assert estado["evaluacion"]["resultado"] == "corresponde"


def test_una_correccion_manual_queda_registrada_con_quien_y_cuando(
    client, headers_administradora, persona_administradora, producto_con_receta
):
    producto = producto_con_receta("Pan con grasa", ["harina", "aceite"])

    corregido = evaluar(
        client, headers_administradora, producto,
        correcciones=[{"hecho": "agrega_grasas", "valor": False, "motivo": "El aceite solo se usa para engrasar moldes"}],
    )
    igual = evaluar(client, headers_administradora, producto, correcciones=[{"hecho": "agrega_grasas", "valor": False}])
    vuelta = evaluar(client, headers_administradora, producto, correcciones=[{"hecho": "agrega_grasas", "valor": True}])
    grasas = agregados(corregido)["agrega_grasas"]

    assert grasas["sugerido"] is True and grasas["corregido"] is False and grasas["valor"] is False
    assert corregido["evaluacion"]["resultado"] == "exceptuado"
    assert len(igual["historial"]) == 1
    assert vuelta["evaluacion"]["resultado"] == "corresponde"
    assert agregados(vuelta)["agrega_grasas"]["corregido"] is None
    primero, ultimo = vuelta["historial"][1], vuelta["historial"][0]
    assert (primero["valor_sugerido"], primero["valor_anterior"], primero["valor_nuevo"]) == (True, None, False)
    assert primero["motivo"] == "El aceite solo se usa para engrasar moldes"
    assert primero["personal"]["id"] == persona_administradora.id and primero["fecha_hora"]
    assert (ultimo["valor_anterior"], ultimo["valor_nuevo"]) == (False, None)


def test_cambiar_una_regla_en_los_parametros_cambia_el_resultado_sin_tocar_el_codigo(
    client, headers_administradora, producto_con_receta
):
    producto = producto_con_receta("Café con leche listo", ["agua", "cafe"])
    antes = evaluar(client, headers_administradora, producto, tipo="liquido")
    borrador = nueva_version(client, headers_administradora, motivo="La cafeína sola no obliga")
    datos = datos_editables(borrador)
    datos["reglas"][1]["hechos"] = ["agrega_azucares", "agrega_grasas", "agrega_sodio", "contiene_edulcorantes"]
    datos["fecha_vigencia"] = "2026-12-01"
    client.put(f"/rotulado-frontal/parametros/{borrador['id']}", headers=headers_administradora, json=datos)
    client.post(f"/rotulado-frontal/parametros/{borrador['id']}/publicar", headers=headers_administradora)

    pendiente = client.get(ruta(producto), headers=headers_administradora).json()
    despues = evaluar(client, headers_administradora, producto, tipo="liquido")

    assert antes["evaluacion"]["resultado"] == "corresponde" and antes["evaluacion"]["conjunto"]["numero"] == 1
    assert pendiente["evaluacion"]["conjunto"]["numero"] == 1
    assert any("versión 2" in aviso for aviso in pendiente["avisos"])
    assert despues["evaluacion"]["resultado"] == "exceptuado" and despues["evaluacion"]["conjunto"]["numero"] == 2
    assert despues["tipo_producto"] == "liquido" and despues["avisos"] == []


def test_una_receta_nueva_avisa_que_hay_que_volver_a_evaluar(
    client, headers_administradora, producto_con_receta, ingredientes_rotulado, unidad_gramo, db_session
):
    producto = producto_con_receta("Pan", ["harina", "agua"])
    evaluar(client, headers_administradora, producto)
    receta_id = db_session.scalar(select(Receta.id).where(Receta.producto_id == producto))
    vigente = client.get(f"/recetas/{receta_id}", headers=headers_administradora).json()["version_vigente"]
    client.post(
        f"/recetas/{receta_id}/versiones",
        headers=headers_administradora,
        json={
            "version_base_id": vigente["id"],
            "motivo": "Lleva sal",
            "rendimiento_cantidad": 1000,
            "rendimiento_unidad_id": unidad_gramo.id,
            "renglones": [
                {"insumo_id": ingredientes_rotulado[c].id, "tipo": "ingrediente", "cantidad": 100, "unidad_medida_id": unidad_gramo.id}
                for c in ("harina", "agua", "sal")
            ],
        },
    )

    estado = client.get(ruta(producto), headers=headers_administradora).json()

    assert estado["evaluacion"]["resultado"] == "exceptuado"
    assert agregados(estado)["agrega_sodio"]["sugerido"] is True
    assert any("receta cambió" in aviso for aviso in estado["avisos"])


def test_sin_receta_se_avisa_y_se_marca_a_mano(client, headers_administradora, db_session, unidad_gramo, parametros):
    producto = Producto(nombre="Producto sin receta", unidad_medida_id=unidad_gramo.id, activo=True)
    db_session.add(producto)
    db_session.commit()

    estado = evaluar(
        client, headers_administradora, producto.id,
        correcciones=[{"hecho": "agrega_sodio", "valor": True, "motivo": "Lleva sal según el proveedor"}],
    )

    assert estado["receta"] is None and "no tiene receta" in estado["avisos"][0]
    assert estado["evaluacion"]["resultado"] == "corresponde"


def test_solo_se_corrigen_agregados_edulcorantes_y_cafeina(client, headers_administradora, producto_con_receta):
    producto = producto_con_receta("Pan", ["harina"])

    respuesta = client.put(
        ruta(producto),
        headers=headers_administradora,
        json={"envasado_ausencia_cliente": True, "correcciones": [{"hecho": "envasado_ausencia_cliente", "valor": False}]},
    )

    assert respuesta.status_code == 422


def test_la_marca_de_edulcorante_se_guarda_en_la_clase_funcional(client, headers_administradora):
    creada = client.post(
        "/clases-funcionales/", headers=headers_administradora, json={"nombre": "Endulzante", "es_edulcorante": True}
    )

    assert creada.status_code in (200, 201), creada.text
    assert creada.json()["es_edulcorante"] is True


def test_las_marcas_de_agregado_se_guardan_en_el_insumo(client, headers_administradora, ingredientes_rotulado):
    harina = ingredientes_rotulado["harina"]

    respuesta = client.put(
        f"/insumos/{harina.id}",
        headers=headers_administradora,
        json={"es_azucar_anadido": True, "es_grasa_anadida": True, "aporta_sodio_anadido": True, "contiene_cafeina": True},
    )

    assert respuesta.status_code == 200, respuesta.text
    datos = respuesta.json()
    assert all(datos[m] for m in ("es_azucar_anadido", "es_grasa_anadida", "aporta_sodio_anadido", "contiene_cafeina"))


def test_con_el_modulo_apagado_la_aplicabilidad_no_responde(
    client, headers_administradora, producto_con_receta, monkeypatch
):
    producto = producto_con_receta("Pan", ["harina"])
    monkeypatch.setattr(settings, "ROTULADO_FRONTAL_ACTIVO", False)

    assert client.get(ruta(producto), headers=headers_administradora).status_code == 503
