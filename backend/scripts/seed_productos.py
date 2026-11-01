"""Catálogo de productos de demostración."""

from src.producto.models import Producto


PRODUCTOS = [
    ("Pan de molde blanco", "Pan de molde de 500 g en bolsa", "un"),
    ("Pan francés", "Pan del día, venta a granel", "kg"),
    ("Facturas surtidas", "Medialunas, vigilantes y bolas de fraile", "un"),
    ("Prepizza", "Base de pizza precocida", "un"),
    ("Tapas de empanada", "Paquete de 12 tapas", "paquete"),
    ("Masa de hojaldre", "Bloque de hojaldre para horno", "kg"),
    ("Galletitas de agua", "Paquete de 250 g", "paquete"),
    ("Budín de vainilla", "Budín de 400 g", "un"),
    ("Torta de chocolate", "Torta entera de 20 cm", "un"),
    ("Alfajores de maicena", "Caja de 6 unidades", "caja"),
    ("Salsa de tomate", "Salsa casera para pizzas y pastas", "L"),
    ("Dulce de leche repostero", "Para relleno de facturas y tortas", "kg"),
    ("Empanadas de carne", "Empanadas al horno", "un"),
    ("Tarta de verduras", "Tarta de acelga y queso", "un"),
    ("Ñoquis de papa", "Pasta fresca", "kg"),
]


def cargar_productos(crear, unidades_por_sufijo):
    productos = []
    for nombre, descripcion, sufijo in PRODUCTOS:
        producto, _ = crear(Producto, {"nombre": nombre}, descripcion=descripcion,
            unidad_medida_id=unidades_por_sufijo[sufijo].id, activo=True)
        productos.append(producto)

    return productos
