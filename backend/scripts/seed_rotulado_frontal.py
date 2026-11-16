"""Marcas de agregados en los insumos de prueba y evaluación de aplicabilidad del rotulado frontal."""

from sqlalchemy import select

from src.claseFuncional.models import ClaseFuncional
from src.rotuladoFrontal import schemas
from src.rotuladoFrontal.aplicabilidad import evaluar_producto
from src.rotuladoFrontal.constants import Hecho, TipoProducto
from src.rotuladoFrontal.models import AplicabilidadProducto

MARCAS = {
    "Azúcar": {"es_azucar_anadido": True},
    "Aceite": {"es_grasa_anadida": True},
    "Sal": {"aporta_sodio_anadido": True},
    "Polvo de hornear (bicarbonato)": {"aporta_sodio_anadido": True},
}

VENTA_EN_MOSTRADOR = {"Pan francés", "Facturas surtidas", "Empanadas de carne", "Tarta de verduras"}

REVISAR = "DEMO: revisado con la nutricionista, vuelve a la sugerencia"

CORRECCIONES = {
    "Facturas surtidas": [[(Hecho.AGREGA_GRASAS, True, "DEMO: la leche entera aporta grasa")], [(Hecho.AGREGA_GRASAS, False, REVISAR)]],
    "Ñoquis de papa": [[(Hecho.AGREGA_GRASAS, True, "DEMO: el huevo aporta grasa")], [(Hecho.AGREGA_GRASAS, False, REVISAR)]],
    "Alfajores de maicena": [[(Hecho.AGREGA_GRASAS, True, "DEMO: la leche entera aporta grasa")]],
    "Dulce de leche repostero": [[(Hecho.AGREGA_GRASAS, True, "DEMO: la leche entera aporta grasa")]],
    "Torta de chocolate": [[(Hecho.CONTIENE_CAFEINA, True, "DEMO: el cacao aporta cafeína")], [(Hecho.CONTIENE_CAFEINA, False, REVISAR)]],
    "Pan de molde blanco": [[(Hecho.AGREGA_AZUCARES, False, "DEMO: se creía que el azúcar se consume en la fermentación")], [(Hecho.AGREGA_AZUCARES, True, REVISAR)]],
    "Galletitas de agua": [[(Hecho.AGREGA_GRASAS, False, "DEMO: el aceite solo se usa para pincelar")], [(Hecho.AGREGA_GRASAS, True, REVISAR)]],
    "Tapas de empanada": [[(Hecho.AGREGA_GRASAS, False, "DEMO: el aceite solo se usa para estirar")], [(Hecho.AGREGA_GRASAS, True, REVISAR)]],
    "Prepizza": [[(Hecho.AGREGA_SODIO, False, "DEMO: la sal se agrega recién al armar la pizza")], [(Hecho.AGREGA_SODIO, True, REVISAR)]],
}


def _correccion(hecho, valor, motivo):
    return schemas.CorreccionDatos(hecho=hecho, valor=valor, motivo=motivo)


def cargar_rotulado_frontal(db, productos, ingredientes, aditivos, admin):
    insumos = {**ingredientes, **aditivos}
    for nombre, marcas in MARCAS.items():
        for campo, valor in marcas.items():
            setattr(insumos[nombre], campo, valor)
    for clase in db.scalars(select(ClaseFuncional).where(ClaseFuncional.nombre == "Edulcorante")):
        clase.es_edulcorante = True
    db.flush()
    for producto in productos:
        if db.scalar(select(AplicabilidadProducto.id).where(AplicabilidadProducto.producto_id == producto.id)):
            continue
        envasado = producto.nombre not in VENTA_EN_MOSTRADOR
        pasadas = CORRECCIONES.get(producto.nombre, [[]])
        for pasada in pasadas:
            datos = schemas.AplicabilidadDatos(
                envasado_ausencia_cliente=envasado,
                tipo_producto=TipoProducto.SOLIDO,
                correcciones=[_correccion(*correccion) for correccion in pasada],
            )
            evaluar_producto(db, producto.id, datos, admin)
    db.flush()
