from datetime import datetime, time, timedelta

from sqlalchemy import select

from scripts.datos_iniciales_alergenos import cargar_alergenos_iniciales
from scripts.panificadora import datos
from scripts.seed_common import ASSETS_DIR
from scripts.seed_recetas import _cargar_version
from scripts.seed_rotulo import cargar_exportaciones
from src.alergeno.models import Alergeno
from src.claseFuncional.models import ClaseFuncional
from src.nutricion.calculo import calcular_informacion
from src.nutricion.constants import AccionHistorial, FuenteNutricional
from src.nutricion.informacion import asegurar_configuracion
from src.nutricion.models import AlimentoReferencia
from src.nutricion.services import cargar_valores, importar_csv, nutrientes_permitidos, valores_de_alimento
from src.producto.models import Producto
from src.receta.composicion import calcular_composicion
from src.receta.constants import MOTIVO_VERSION_INICIAL, EstadoVersionReceta
from src.receta.models import Receta
from src.rotuladoFrontal import schemas as schemas_rotulado
from src.rotuladoFrontal.aplicabilidad import evaluar_producto
from src.rotuladoFrontal.constants import ResultadoAplicabilidad, TipoProducto
from src.rotuladoFrontal.models import AplicabilidadProducto
from src.rotuladoFrontal.sellos import calcular_sellos
from src.rotulo import alergenos as alergenos_rotulo
from src.rotulo.constants import CampoAutomatico, CondicionConservacion, TipoRegistro, UnidadVidaUtil
from src.rotulo.models import BorradorRotulo, EdicionCampoRotulo
from src.rotulo.services import datos_del_sistema, meta_automatico, refrescar_automaticos
from src.unidadMedida.models import TipoUnidadMedida

ARCHIVO_REFERENCIA = ASSETS_DIR / "alimentos_referencia_demo.csv"
RENDIMIENTO_COCCION = 0.88
RENDIMIENTO_SIN_COCCION = {"Tapas de empanada para horno": 0.98}


def cargar_productos(crear, unidades):
    productos = {}
    for nombre, descripcion, sufijo, activo in datos.PRODUCTOS:
        producto, _ = crear(Producto, {"nombre": nombre}, descripcion=descripcion,
            unidad_medida_id=unidades[sufijo].id, activo=activo)
        productos[nombre] = producto
    return productos


def cargar_recetas(db, crear, productos, ingredientes, aditivos, unidades, equipos, admin, hoy):
    origen = datetime.combine(hoy - timedelta(days=120), time(9))
    versiones_por_producto = {}
    for nombre, receta_datos in datos.RECETAS.items():
        receta, _ = crear(Receta, {"producto_id": productos[nombre].id}, fecha_creacion=origen)
        nueva = datos.VERSIONES_NUEVAS.get(nombre)
        _cargar_version(crear, receta, 1,
            EstadoVersionReceta.ARCHIVADA if nueva else EstadoVersionReceta.VIGENTE,
            MOTIVO_VERSION_INICIAL, receta_datos, ingredientes, aditivos, unidades, equipos, admin, {})
        if nueva:
            _, motivo, cambios = nueva
            _cargar_version(crear, receta, 2, EstadoVersionReceta.VIGENTE, motivo, receta_datos,
                ingredientes, aditivos, unidades, equipos, admin, dict(cambios))
        db.flush()
        db.refresh(receta)
        historial = []
        for version in sorted(receta.versiones, key=lambda v: v.numero):
            if version.numero == 1:
                version.fecha_creacion = origen
            else:
                version.fecha_creacion = datetime.combine(hoy - timedelta(days=nueva[0]), time(16))
            calcular_composicion(version)
            historial.append(version)
        versiones_por_producto[nombre] = historial
    db.flush()
    return versiones_por_producto


def cargar_alergenos(db, ingredientes, aditivos):
    cargar_alergenos_iniciales(db)
    por_nombre = {a.nombre: a for a in db.scalars(select(Alergeno))}
    insumos = {**ingredientes, **aditivos}
    for nombre, (marcas, gluten) in datos.ALERGENOS.items():
        insumo = insumos[nombre]
        insumo.alergenos = [por_nombre[m] for m in marcas if m in por_nombre]
        insumo.contiene_gluten = gluten
    db.flush()
    return por_nombre


def cargar_nutricion(db, ingredientes, aditivos, admin):
    importar_csv(db, ARCHIVO_REFERENCIA.read_text(encoding="utf-8"), datos.FUENTE_REFERENCIA, confirmar=False)
    alimentos = {a.codigo: a for a in db.scalars(
        select(AlimentoReferencia).where(AlimentoReferencia.fuente == datos.FUENTE_REFERENCIA))}
    for nombre in datos.REFERENCIAS_ADITIVOS:
        aditivos[nombre].aporta_energia_sodio = True
    copias = [(ingredientes[n], c) for n, c in datos.REFERENCIAS_NUTRICIONALES.items()]
    copias += [(aditivos[n], c) for n, c in datos.REFERENCIAS_ADITIVOS.items()]
    for insumo, codigo in copias:
        alimento = alimentos[codigo]
        permitidos = set(nutrientes_permitidos(insumo))
        valores = {n: v for n, v in valores_de_alimento(alimento).items() if n in permitidos}
        cargar_valores(db, insumo, valores, FuenteNutricional.BASE_REFERENCIA,
            f"{alimento.fuente} · {alimento.codigo} · {alimento.nombre}", alimento.id,
            AccionHistorial.COPIA_REFERENCIA, admin)
    for nombre, valores in datos.ROTULOS_PROVEEDOR.items():
        cargar_valores(db, ingredientes[nombre], dict(valores), FuenteNutricional.ROTULO_PROVEEDOR,
            "Rótulo del envase del proveedor", None, AccionHistorial.CARGA_MANUAL, admin)
    db.flush()
    asegurar_configuracion(db)


def calcular_nutricion_recetas(db, versiones_por_producto):
    for nombre, versiones in versiones_por_producto.items():
        for version in versiones:
            if version.rendimiento_unidad.tipo == TipoUnidadMedida.UNIDAD and version.composicion_total_gramos:
                factor = RENDIMIENTO_SIN_COCCION.get(nombre, RENDIMIENTO_COCCION)
                version.rendimiento_peso_g = round(version.composicion_total_gramos * factor, -1)
            calcular_informacion(db, version)
    db.flush()


def cargar_rotulado_frontal(db, productos, ingredientes, aditivos, admin):
    insumos = {**ingredientes, **aditivos}
    for nombre, marcas in datos.MARCAS_AGREGADOS.items():
        for campo, valor in marcas.items():
            setattr(insumos[nombre], campo, valor)
    for clase in db.scalars(select(ClaseFuncional).where(ClaseFuncional.nombre == "Edulcorante")):
        clase.es_edulcorante = True
    db.flush()
    for nombre in datos.RECETAS:
        producto = productos[nombre]
        correcciones = [schemas_rotulado.CorreccionDatos(hecho=h, valor=v, motivo=m)
            for h, v, m in datos.CORRECCIONES_ROTULADO.get(nombre, [])]
        evaluar_producto(db, producto.id, schemas_rotulado.AplicabilidadDatos(
            envasado_ausencia_cliente=nombre not in datos.VENTA_A_GRANEL,
            tipo_producto=TipoProducto.SOLIDO, correcciones=correcciones), admin)
    db.flush()
    for nombre in datos.RECETAS:
        producto = productos[nombre]
        registro = db.scalar(select(AplicabilidadProducto).where(AplicabilidadProducto.producto_id == producto.id))
        if registro is not None and registro.resultado == ResultadoAplicabilidad.CORRESPONDE:
            calcular_sellos(db, producto.id, admin)
    db.flush()


def _borrador(db, producto, indice, unidades, admin, ahora):
    cantidad, sufijo, vida_util, _, _ = datos.ROTULOS[producto.nombre]
    borrador = BorradorRotulo(
        producto_id=producto.id, contenido_neto=cantidad, contenido_neto_unidad_id=unidades[sufijo].id,
        razon_social=datos.EMPRESA, domicilio=datos.DOMICILIO, pais_origen="Argentina",
        tipo_registro=TipoRegistro.RPPA, numero_registro=f"02-{310000 + indice * 17}",
        numero_establecimiento=datos.NUMERO_ESTABLECIMIENTO,
        vida_util_cantidad=vida_util, vida_util_unidad=UnidadVidaUtil.DIAS,
        requiere_instrucciones=producto.nombre in datos.INSTRUCCIONES,
        instrucciones=datos.INSTRUCCIONES.get(producto.nombre), automaticos={},
        creado_por_id=admin.id, creado_en=ahora, actualizado_por_id=admin.id, actualizado_en=ahora)
    sistema = datos_del_sistema(db, producto)
    refrescar_automaticos(borrador, sistema)
    valor_sistema, origen = sistema[CampoAutomatico.IDENTIFICACION_LOTE]
    borrador.ediciones.append(EdicionCampoRotulo(
        campo=CampoAutomatico.IDENTIFICACION_LOTE, origen=origen, valor_sistema=valor_sistema,
        valor_original=borrador.identificacion_lote, valor_nuevo="Ver cierre del envase",
        personal_id=admin.id, fecha_hora=ahora))
    borrador.identificacion_lote = "Ver cierre del envase"
    automaticos = dict(borrador.automaticos)
    automaticos[CampoAutomatico.IDENTIFICACION_LOTE.value] = meta_automatico(valor_sistema, origen, True, admin.id, ahora)
    borrador.automaticos = automaticos
    return borrador


def cargar_rotulos(db, productos, unidades, por_alergeno, admin):
    ahora = datetime.now()
    for indice, nombre in enumerate(datos.ROTULOS, start=1):
        producto = productos[nombre]
        borrador = _borrador(db, producto, indice, unidades, admin, ahora)
        _, _, _, condicion, frio = datos.ROTULOS[nombre]
        if condicion == "refrigerado":
            minima, maxima, abierto = frio
            borrador.conservacion_condicion = CondicionConservacion.REFRIGERADO
            borrador.conservacion_temp_min = minima
            borrador.conservacion_temp_max = maxima
            borrador.conservacion_duracion_cantidad = datos.ROTULOS[nombre][2]
            borrador.conservacion_abierto = abierto
        else:
            borrador.conservacion_condicion = CondicionConservacion.AMBIENTE
        borrador.puede_contener_ids = sorted(por_alergeno[n].id for n in datos.PUEDE_CONTENER.get(nombre, []))
        db.add(borrador)
        db.flush()
        if nombre not in datos.ROTULOS_SIN_CONFIRMAR and alergenos_rotulo.armar_propuesta(db, producto.id).version is not None:
            alergenos_rotulo.confirmar(db, borrador, admin)
    db.flush()
    cargar_exportaciones(db, [productos[n] for n in datos.ROTULOS], admin)
