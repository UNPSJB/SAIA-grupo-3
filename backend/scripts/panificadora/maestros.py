from datetime import timedelta

from scripts.panificadora import datos
from scripts.seed_common import PASSWORD_ADMIN, PASSWORD_OPERARIO
from scripts.seed_recetas import _cargar_aditivos
from scripts.seed_unidades_medida import cargar_unidades_medida
from src.auth.utils import get_password_hash
from src.elementos.models import Elemento
from src.equipos.models import Equipo
from src.insumos.models import Insumo
from src.insumosQuimicos.models import InsumoQuimico
from src.personal.models import Personal
from src.sector.models import Sector


def cargar_personal(crear):
    hashes = {"admin": get_password_hash(PASSWORD_ADMIN), "opera": get_password_hash(PASSWORD_OPERARIO)}
    personas = {}
    for i, (usuario, nombre, apellido, dni, operar, administrar, activo, clave) in enumerate(datos.PERSONAL, start=1):
        persona, _ = crear(Personal, {"username": usuario}, nombre=nombre, apellido=apellido, dni=dni,
            nroLegajo=f"LED-{i:03d}", email=f"{usuario}@{datos.DOMINIO_EMAIL}", operar=operar,
            administrar=administrar, activo=activo, hashed_password=hashes[clave])
        personas[usuario] = persona
    return personas


def cargar_unidades(crear):
    _, unidades = cargar_unidades_medida(crear)
    return unidades


def cargar_sectores(crear):
    sectores = {}
    for clave, nombre in datos.SECTORES.items():
        sector, _ = crear(Sector, {"nombre": nombre}, activo=True)
        sectores[clave] = sector
    return sectores


def asignar_sectores(personas, sectores):
    for usuario, claves in datos.SECTORES_PERSONAL.items():
        personas[usuario].sectores = [sectores[c] for c in claves]


def cargar_equipos(crear, sectores):
    equipos = {}
    for i, (clave, nombre, tipo, sector, periodicidad, rango) in enumerate(datos.EQUIPOS, start=1):
        equipo, _ = crear(Equipo, {"numero_serie": f"LED-EQ-{i:03d}"}, nombre=nombre, tipo=tipo,
            sector_id=sectores[sector].id, activo=clave != "horno_piso", periodicidad_dias=periodicidad,
            controla_temperatura=rango is not None,
            temperatura_minima=rango[0] if rango else None,
            temperatura_maxima=rango[1] if rango else None)
        equipos[clave] = equipo
    return equipos


def cargar_insumos(crear, unidades):
    ingredientes = {}
    for nombre, sufijo, denominacion, densidad, *_ in datos.INGREDIENTES:
        ingrediente, _ = crear(Insumo, {"nombre": nombre}, unidad_medida_id=unidades[sufijo].id,
            denominacion_rotulo=denominacion, densidad_g_ml=densidad,
            stock_minimo=datos.STOCK_MINIMO_INGREDIENTES.get(nombre), activo=True)
        ingredientes[nombre] = ingrediente
    aditivos = _cargar_aditivos(crear, unidades)
    for nombre, densidad in datos.DENSIDADES_ADITIVOS.items():
        aditivos[nombre].densidad_g_ml = densidad
    return ingredientes, aditivos


def cargar_quimicos(crear, unidades):
    quimicos = {}
    for nombre, tipo, cantidad, minimo in datos.QUIMICOS:
        quimico, _ = crear(InsumoQuimico, {"nombre": nombre}, cantidad=cantidad, stock_minimo=minimo,
            unidad_medida_id=unidades["L"].id, tipo_quimico=tipo, activo=True)
        quimicos[nombre] = quimico
    return quimicos


def cargar_elementos(crear, hoy):
    elementos = {}
    for nombre, frecuencia, ultimo in datos.ELEMENTOS:
        fecha_ultimo = hoy + timedelta(days=ultimo)
        elemento, _ = crear(Elemento, {"nombre": nombre}, frecuencia_recambio=frecuencia,
            fecha_ultimo_recambio=fecha_ultimo,
            fecha_proximo_recambio=fecha_ultimo + timedelta(days=frecuencia), activo=True)
        elementos[nombre] = elemento
    return elementos
