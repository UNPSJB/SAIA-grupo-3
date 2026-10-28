"""Carga datos de demostración de forma repetible y sin borrar datos.

Ejecutar desde backend/:  .venv/bin/python seed.py
"""
from __future__ import annotations

import shutil
from pathlib import Path
from datetime import date, datetime, time, timedelta

from sqlalchemy import func, inspect, select

# Importar la app registra todos los modelos en la metadata SQLAlchemy.
from src.main import app  # noqa: F401
from src.config import UPLOADS_DIR, ARCHIVOS_DIR
from src.database import SessionLocal, engine
from src.models import ModeloBase
from src.auth.utils import get_password_hash
from src.personal.models import Personal
from src.unidadMedida.models import UnidadMedida, TipoUnidadMedida
from src.sector.models import Sector
from src.equipos.models import Equipo, TipoEquipo
from src.insumos.models import Insumo
from src.insumosQuimicos.models import InsumoQuimico, TipoQuimico
from src.elementos.models import Elemento
from src.tarea.models import Tarea, TareaInsumoQuimico, FrecuenciaTarea
from src.plan.models import Plan
from src.documentacion.models import Documentacion
from src.tipoDocumento.models import TipoDocumento
from src.tipoIncidente.models import TipoIncidente as ModeloTipoIncidente
from src.incidente.models import Incidente
from src.incidente.constants import EstadoIncidente
from src.incidente.auditoria import AccionMovimientoIncidente, MovimientoIncidente
from src.accionCorrectiva.models import AccionCorrectiva
from src.registroCalibracion.models import RegistroCalibracion
from src.checklist.models import ItemChecklist, EstadoItem, MovimientoItemChecklist, AccionMovimiento
from src.planRealizado.models import PlanRealizado
from src.tareaRealizada.models import TareaRealizada
from src.consumoQuimico.models import ConsumoQuimico
from src.notificaciones.models import Notificacion, TipoNotificacion
from src.producto.models import Producto
from src.loteProduccion.models import LoteProduccion

from src.documentoTecnico.models import (DocumentoTecnico, VersionDocumentoTecnico, CambioVigenciaDocumentoTecnico, TipoDocumentoTecnico, EstadoDocumento)

CANTIDAD = 15
PASSWORD_ADMIN = "admin123"
PASSWORD_OPERARIO = "opera123"
ASSETS_DIR = Path(__file__).resolve().parent / "seed_assets"

# Nombres verosímiles; todos los perfiles, DNIs y legajos son datos ficticios.
# Tipos del seed: los 4 del enum histórico (HU 23: "algo se rompió" = equipos,
# "hallazgo de plaga" = plagas, "devolución de cliente" = producto/cliente,
# más higiene, el corazón del sistema) + Accidente y Otros (Deuda tecnica.md #1).
TIPOS_INCIDENTE_OBLIGATORIOS = [("Higiene y limpieza", "info"), ("Plagas", "danger"),
    ("Equipos e instalaciones", "primary"), ("Producto / cliente", "success")]
TIPOS_INCIDENTE = TIPOS_INCIDENTE_OBLIGATORIOS + [
    ("Accidente", "warning"), ("Otros", "secondary")]
# Tipo dado de baja: sirve para probar que no aparece al reportar ni en los filtros,
# pero que los incidentes que ya lo usan lo siguen mostrando (y se pueden editar).
TIPO_INCIDENTE_INACTIVO = ("Reclamo de proveedor", "dark")
INCIDENTES_TIPO_INACTIVO = [
    ("Un proveedor entregó cajas de insumos con el embalaje dañado.", None, 5),
    ("Un proveedor entregó un lote sin la etiqueta de trazabilidad.",
     "Se devolvió el lote y se pidió al proveedor que lo reemplace etiquetado.", 20),
]
PERSONAS = [
    ("Lucía", "Fernández"), ("María", "Gómez"), ("Carlos", "Pérez"),
    ("Ana", "Rodríguez"), ("Diego", "Martínez"), ("Sofía", "López"),
    ("Javier", "García"), ("Valentina", "Torres"), ("Pablo", "Romero"),
    ("Camila", "Díaz"), ("Martín", "Acosta"), ("Florencia", "Ruiz"),
    ("Nicolás", "Suárez"), ("Julieta", "Castro"), ("Gabriel", "Herrera"),
]
SECTORES = ["Recepción de materias primas", "Depósito de alimentos secos", "Cámara de refrigeración",
    "Cámara de congelación", "Lavado de vegetales", "Preparación de carnes", "Cocina caliente",
    "Panadería", "Pastelería", "Envasado", "Despacho", "Lavado de vajilla",
    "Depósito de productos de limpieza", "Vestuario del personal", "Gestión de residuos"]
EQUIPOS = ["Balanza de recepción", "Termohigrómetro del depósito", "Termómetro de cámara frigorífica",
    "Sonda de temperatura del congelador", "Lavadora de vegetales", "Mesa de corte de acero inoxidable",
    "Horno convector", "Amasadora espiral", "Batidora planetaria", "Selladora de envases",
    "Carro térmico de despacho", "Lavavajillas industrial", "Dosificador de detergente",
    "Dispensador de jabón", "Contenedor de residuos con pedal"]
INSUMOS = ["Guantes de nitrilo", "Cofias descartables", "Barbijos tricapa", "Delantales descartables",
    "Bolsas para residuos", "Papel para secado de manos", "Paños descartables", "Film alimentario",
    "Bolsas de envasado al vacío", "Etiquetas de trazabilidad", "Precintos de seguridad",
    "Esponjas no abrasivas", "Cepillos de uñas", "Fundas para calzado", "Papel absorbente industrial"]
QUIMICOS = ["Detergente neutro para vajilla", "Detergente alcalino para hornos", "Desinfectante clorado",
    "Sanitizante de amonio cuaternario", "Alcohol etílico al 70 %", "Desengrasante de cocina",
    "Limpiador de acero inoxidable", "Detergente para lavavajillas", "Abrillantador de vajilla",
    "Desincrustante ácido", "Jabón líquido para manos", "Limpiador de pisos",
    "Desinfectante para superficies", "Sanitizante de vegetales", "Detergente espumante"]
ELEMENTOS = ["Escoba de cerdas suaves", "Secador de piso", "Mopa de microfibra", "Balde con escurridor",
    "Cepillo de juntas", "Cepillo para desagües", "Paño azul para mesadas", "Paño rojo para residuos",
    "Paño verde para vegetales", "Esponja para vajilla", "Espátula para hornos", "Pulverizador graduado",
    "Cepillo para bandejas", "Pala de residuos", "Carro de limpieza"]
TIPOS_DOCUMENTO = ["Carnet de manipulador de alimentos", "Libreta sanitaria", "Apto psicofísico",
    "Certificado de capacitación en BPM", "Capacitación en POES", "Constancia de higiene de manos",
    "Capacitación en alérgenos", "Capacitación en trazabilidad", "Inducción de seguridad e higiene",
    "Capacitación en manejo de químicos", "Constancia de uso de EPP", "Capacitación en control de plagas",
    "Capacitación en cadena de frío", "Capacitación en gestión de residuos", "Aptitud para tareas de cocina"]
DOCUMENTOS_TECNICOS = ["Manual de buenas prácticas de manufactura", "POES de recepción de materias primas",
    "Control de temperatura de cámaras", "Procedimiento de descongelación segura", "Lavado de vegetales",
    "Prevención de contaminación cruzada", "Limpieza de horno convector", "Higiene de amasadoras",
    "Control de alérgenos en pastelería", "Trazabilidad del envasado", "Control de despacho de alimentos",
    "Desinfección de vajilla", "Ficha técnica de detergente neutro", "Higiene de manos del personal",
    "Receta de demostración para preparación de vegetales"]
# Fotografías de contexto, no evidencia de sucesos reales. Créditos en seed_assets/FUENTES.md.
FOTOS = ["cocina-industrial.jpg", "lavado-utensilios.jpg", "mesada-lavado.jpg"]
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
INCIDENTES = [
    ("El área de recepción requiere repetir la limpieza de la mesada antes del ingreso del lote.", "Se repitió la limpieza y se verificó la liberación de la mesada.", 0),
    ("El registro de higiene del depósito quedó incompleto al finalizar el turno.", "Se completó el registro y se capacitó al responsable del turno.", 0),
    ("La verificación de temperatura de la cámara no quedó registrada.", "Se verificó la temperatura y se documentó el control.", 0),
    ("La sonda utilizada en congelados requiere verificación antes del próximo turno.", "Se retiró la sonda y se asignó un instrumento verificado.", 0),
    ("Se debe repetir el enjuague de utensilios del sector de vegetales.", "Se realizó un nuevo enjuague y control visual de los utensilios.", 1),
    ("La mesada de preparación necesita sanitización entre dos lotes.", "Se sanitizó la mesada y se separaron los utensilios por tipo de alimento.", 2),
    ("La limpieza de bandejas del horno quedó pendiente al cierre del turno.", "Se limpiaron las bandejas y se registró la liberación del horno.", 0),
    ("La planilla de limpieza de la amasadora no tiene firma de verificación.", "El supervisor verificó la limpieza y completó la firma.", 0),
    ("Falta identificar los utensilios destinados a preparaciones sin alérgenos.", "Se identificaron los utensilios y se separó su almacenamiento.", 1),
    ("Una etiqueta del lote envasado carece de hora de elaboración.", "Se reetiquetó el lote tras verificar la trazabilidad.", 0),
    ("La planilla de despacho requiere completar el control del carro térmico.", "Se verificó el carro y se completó el registro de despacho.", 0),
    ("Se detectó una omisión en la verificación final del lavado de vajilla.", "Se repitió la verificación y se liberó la vajilla limpia.", 1),
    ("El dosificador de detergente necesita revisar su identificación.", "Se identificó el dosificador y se verificó el producto cargado.", 2),
    ("El dispensador de jabón requiere reposición antes del próximo turno.", "Se repuso el jabón y se comprobó el funcionamiento del dispensador.", 2),
    ("El retiro de residuos requiere registrar la limpieza del contenedor.", "Se limpió el contenedor y se completó el registro de retiro.", 0),
]


def obtener_o_crear(db, modelo, filtros, valores):
    """Claves estables: repetir el seed no duplica ni borra registros."""
    registro = db.scalar(select(modelo).filter_by(**filtros))
    creado = registro is None
    if creado:
        registro = modelo(**filtros, **valores)
        db.add(registro)
        db.flush()
    return registro, creado


def foto_contexto(indice):
    origen = ASSETS_DIR / FOTOS[indice % len(FOTOS)]
    if not origen.is_file() or origen.read_bytes()[:3] != b"\xff\xd8\xff":
        raise FileNotFoundError(f"Falta la fotografía JPEG del seed: {origen}")
    UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
    destino = UPLOADS_DIR / ("seed-contexto-" + origen.name)
    if not destino.exists():
        shutil.copyfile(origen, destino)
    return "/uploads/" + destino.name


def _pdf_certificado(titulo: str, lineas: list[str]) -> bytes:
    """Arma un PDF mínimo válido (una página con texto) sin librerías externas."""
    def escapar(texto: str) -> str:
        return texto.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")

    contenido = ["BT", "/F1 20 Tf", "72 760 Td", f"({escapar(titulo)}) Tj", "/F1 12 Tf"]
    for linea in lineas:
        contenido += ["0 -24 Td", f"({escapar(linea)}) Tj"]
    contenido.append("ET")
    stream = "\n".join(contenido).encode("latin-1", "replace")

    objetos = [
        b"<< /Type /Catalog /Pages 2 0 R >>",
        b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 842] "
        b"/Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
        b"<< /Length " + str(len(stream)).encode() + b" >>\nstream\n" + stream + b"\nendstream",
    ]
    salida = bytearray(b"%PDF-1.4\n")
    offsets = []
    for numero, cuerpo in enumerate(objetos, start=1):
        offsets.append(len(salida))
        salida += f"{numero} 0 obj\n".encode() + cuerpo + b"\nendobj\n"
    inicio_xref = len(salida)
    salida += f"xref\n0 {len(objetos) + 1}\n0000000000 65535 f \n".encode()
    for offset in offsets:
        salida += f"{offset:010d} 00000 n \n".encode()
    salida += (
        f"trailer\n<< /Size {len(objetos) + 1} /Root 1 0 R >>\n"
        f"startxref\n{inicio_xref}\n%%EOF\n"
    ).encode()
    return bytes(salida)



def cargar_seed(*, session_factory=SessionLocal, db_engine=engine, hoy=None):
    """Carga 15 ejemplos por entidad; conserva datos existentes y no descuenta stock.

    Los historiales y tablas de asociación pueden superar 15 filas. Los nombres
    son ficticios y los archivos PDF se identifican como documentos de prueba.
    """
    hoy = hoy or date.today()
    ayer = hoy - timedelta(days=1)
    fotos = [foto_contexto(i) for i in range(len(FOTOS))]
    ModeloBase.metadata.create_all(bind=db_engine)
    resumen = {}
    with session_factory() as db:
        try:
            def crear(modelo, filtros, **valores):
                registro, nuevo = obtener_o_crear(db, modelo, filtros, valores)
                resumen[modelo.__name__] = resumen.get(modelo.__name__, 0) + int(nuevo)
                return registro, nuevo

            personas = []
            hashes = [get_password_hash(PASSWORD_ADMIN), get_password_hash(PASSWORD_OPERARIO)]
            usuarios_especiales = ["admin", "opera", "admin.solo", "sin.permisos", "inactivo.demo"]
            for i, (nombre, apellido) in enumerate(PERSONAS):
                username = usuarios_especiales[i] if i < 5 else f"seed.personal{i + 1:02d}"
                persona, _ = crear(Personal, {"username": username}, nombre=nombre, apellido=apellido,
                    dni=f"9500{i + 1:04d}", nroLegajo=f"SAIA-{i + 1:03d}",
                    email=f"{username}@example.com", operar=i not in (2, 3),
                    administrar=i in (0, 2), activo=i != 4, hashed_password=hashes[i != 0])
                personas.append(persona)
            operadores = [p for p in personas if p.operar and p.activo]
            admin = personas[0]

            unidades = []
            definiciones = [(TipoUnidadMedida.UNIDAD, s) for s in ["un", "par", "caja", "paquete", "rollo"]]
            definiciones += [(TipoUnidadMedida.PESO, s) for s in ["mg", "g", "kg", "lb"]]
            definiciones += [(TipoUnidadMedida.CAPACIDAD, s) for s in ["ml", "L", "cc", "gal"]]
            definiciones += [(TipoUnidadMedida.LONGITUD, s) for s in ["cm", "m"]]
            for tipo, sufijo in definiciones:
                unidad, _ = crear(UnidadMedida, {"sufijo": sufijo}, tipo=tipo, activo=True)
                unidades.append(unidad)
            litro = next(u for u in unidades if u.sufijo == "L")
            unidad = unidades[0]
            sectores, equipos, insumos, quimicos, elementos, tareas, planes = ([] for _ in range(7))
            tipos_equipo = [TipoEquipo.INSTRUMENTO] * 4 + [TipoEquipo.EQUIPO, TipoEquipo.HERRAMIENTA] + [TipoEquipo.EQUIPO] * 7 + [TipoEquipo.HERRAMIENTA] * 2
            tipos_quimico = list(TipoQuimico)
            for i in range(CANTIDAD):
                sector, _ = crear(Sector, {"nombre": SECTORES[i]}, activo=True)
                sectores.append(sector)
                equipo, _ = crear(Equipo, {"numero_serie": f"SAIA-EQ-{i + 1:04d}"}, nombre=EQUIPOS[i],
                    tipo=tipos_equipo[i], sector_id=sector.id, activo=True,
                    periodicidad_dias=[365, 180, 90][i % 3])
                equipos.append(equipo)
                insumo, _ = crear(Insumo, {"nombre": INSUMOS[i]}, cantidad=150.0 + i * 10,
                    unidad_medida_id=unidad.id, activo=True)
                insumos.append(insumo)
                # Clasificaciones correspondientes a los nombres comerciales genéricos.
                nombre_tipo = "desinfectante" if i in (2, 3, 4, 12, 13) else "detergente" if i in (0, 1, 7, 10, 14) else "desengrasante" if i == 5 else "otro"
                tipo = next((t for t in tipos_quimico if t.value == nombre_tipo), tipos_quimico[-1])
                quimico, _ = crear(InsumoQuimico, {"nombre": QUIMICOS[i]}, cantidad=100.0 + i * 5,
                    unidad_medida_id=litro.id, tipo_quimico=tipo, activo=True)
                quimicos.append(quimico)
                elemento, _ = crear(Elemento, {"nombre": ELEMENTOS[i]}, frecuencia_recambio=60,
                    fecha_ultimo_recambio=hoy - timedelta(days=60),
                    fecha_proximo_recambio=hoy + timedelta(days=[-7, 0, 7, 30, 60][i % 5]), activo=True)
                elementos.append(elemento)
                nombre_tarea = f"Limpieza y verificación de {EQUIPOS[i].lower()}"
                tarea, nueva = crear(Tarea, {"nombre": nombre_tarea}, frecuencia=FrecuenciaTarea.DIARIA,
                    equipo_id=equipo.id, procedimiento=f"Retirar residuos de {EQUIPOS[i].lower()}, limpiar según la ficha del producto, enjuagar cuando corresponda y verificar la superficie. Registrar la ejecución y el consumo efectivo; no mezclar productos.")
                if nueva:
                    tarea.elementos = [elemento]
                crear(TareaInsumoQuimico, {"tarea_id": tarea.id, "insumo_quimico_id": quimico.id}, cantidad=0.25)
                tareas.append(tarea)
                responsable = admin if i % 5 == 0 else personas[1]
                plan, nuevo = crear(Plan, {"nombre": f"POES - {SECTORES[i]}"}, responsable_id=responsable.id,
                    descripcion=f"Programa de higiene y verificación del sector {SECTORES[i].lower()}.",
                    sector_id=sector.id, equipo_id=equipo.id, activo=True, fecha_inicio=ayer, fecha_fin=None)
                if nuevo:
                    plan.tareas = [tarea]
                planes.append(plan)

            tipos_obligatorios, tipos_activos = [], []
            for indice, (nombre_tipo, color) in enumerate(TIPOS_INCIDENTE):
                tipo_creado, _ = crear(ModeloTipoIncidente, {"nombre": nombre_tipo}, color=color, activo=True)
                tipos_activos.append(tipo_creado)
                if indice < len(TIPOS_INCIDENTE_OBLIGATORIOS):
                    tipos_obligatorios.append(tipo_creado)
            nombre_inactivo, color_inactivo = TIPO_INCIDENTE_INACTIVO
            tipo_inactivo, _ = crear(ModeloTipoIncidente, {"nombre": nombre_inactivo},
                color=color_inactivo, activo=False)

            for i, nombre in enumerate(TIPOS_DOCUMENTO):
                tipo, _ = crear(TipoDocumento, {"nombre": nombre}, activo=True)
                crear(Documentacion, {"personal_id": operadores[i % len(operadores)].id, "tipo_documento_id": tipo.id},
                    fecha_vencimiento=hoy + timedelta(days=[-7, 0, 7, 30, 90][i % 5]))
                crear(Notificacion, {"clave": f"seed-saia-documentacion-{i + 1:02d}"},
                    tipo=TipoNotificacion.VENCIMIENTO_DOCUMENTACION,
                    titulo=f"Control documental: {nombre}"[:100],
                    mensaje=f"Revisar la vigencia de {nombre.lower()} del personal asignado.",
                    enlace="/personal/vencimientos", fecha_creacion=datetime.combine(hoy, time(8, i)), leida=i >= 5)

            for i, (descripcion, correccion, foto_indice) in enumerate(INCIDENTES):
                reportante = personas[1] if i % 2 == 0 else operadores[i % len(operadores)]
                incidente, nuevo = crear(Incidente, {"descripcion": descripcion}, reportado_por_dni=reportante.dni,
                    # Recorre los 6 tipos activos: todos tienen historial en el listado.
                    tipo_id=tipos_activos[i % len(tipos_activos)].id,
                    fecha_hora=datetime.combine(hoy - timedelta(days=[1, 3, 7, 15, 30][i % 5]), time(9, i)), imagen_path=fotos[foto_indice],
                    estado=EstadoIncidente.CERRADO if i % 3 else EstadoIncidente.ABIERTO)
                # Un cierre histórico por incidente; los abiertos tienen una reapertura.
                if nuevo:
                    momento = incidente.fecha_hora
                    crear(MovimientoIncidente, {"incidente_id": incidente.id, "accion": AccionMovimientoIncidente.REPORTADO},
                        personal_id=reportante.id, fecha_hora=momento)
                    crear(AccionCorrectiva, {"incidente_id": incidente.id, "descripcion": correccion},
                        responsable_id=admin.id, fecha_cierre=momento + timedelta(hours=1), vigente=i % 3 != 0)
                    crear(MovimientoIncidente, {"incidente_id": incidente.id, "accion": AccionMovimientoIncidente.CERRADO},
                        personal_id=admin.id, fecha_hora=momento + timedelta(hours=1), motivo=correccion)
                    if i % 3 == 0:
                        crear(MovimientoIncidente, {"incidente_id": incidente.id, "accion": AccionMovimientoIncidente.REABIERTO},
                            personal_id=admin.id, fecha_hora=momento + timedelta(hours=2),
                            motivo="La revisión del turno siguiente solicita una nueva verificación del procedimiento.")

            # Abiertos de demostración para las tarjetas por tipo (con hover) de Incidentes
            # Abiertos: los 4 históricos + Accidente con 1, 7 y 30 días. "Otros" queda
            # sin abiertos a propósito, para ver una tarjeta en 0.
            tipos_con_abiertos = tipos_obligatorios + [tipos_activos[len(TIPOS_INCIDENTE_OBLIGATORIOS)]]
            for i, tipo in enumerate(tipos_con_abiertos):
                for dias in (1, 7, 30):
                    descripcion = f"Demostración: incidente de {tipo.nombre.lower()} pendiente de resolución ({dias} días)."
                    reportante = personas[1]
                    incidente, nuevo = crear(Incidente, {"descripcion": descripcion},
                        tipo_id=tipo.id, reportado_por_dni=reportante.dni,
                        fecha_hora=datetime.combine(hoy - timedelta(days=dias), time(8)),
                        imagen_path=fotos[i % len(fotos)], estado=EstadoIncidente.ABIERTO)
                    if nuevo:
                        crear(MovimientoIncidente,
                            {"incidente_id": incidente.id, "accion": AccionMovimientoIncidente.REPORTADO},
                            personal_id=reportante.id, fecha_hora=incidente.fecha_hora)

            # Incidentes con el tipo dado de baja: uno abierto y uno cerrado.
            for i, (descripcion, correccion, dias) in enumerate(INCIDENTES_TIPO_INACTIVO):
                reportante = personas[1]
                incidente, nuevo = crear(Incidente, {"descripcion": descripcion},
                    tipo_id=tipo_inactivo.id, reportado_por_dni=reportante.dni,
                    fecha_hora=datetime.combine(hoy - timedelta(days=dias), time(11, i)),
                    imagen_path=fotos[i % len(fotos)],
                    estado=EstadoIncidente.CERRADO if correccion else EstadoIncidente.ABIERTO)
                if nuevo:
                    momento = incidente.fecha_hora
                    crear(MovimientoIncidente, {"incidente_id": incidente.id, "accion": AccionMovimientoIncidente.REPORTADO},
                        personal_id=reportante.id, fecha_hora=momento)
                    if correccion:
                        crear(AccionCorrectiva, {"incidente_id": incidente.id, "descripcion": correccion},
                            responsable_id=admin.id, fecha_cierre=momento + timedelta(hours=1), vigente=True)
                        crear(MovimientoIncidente, {"incidente_id": incidente.id, "accion": AccionMovimientoIncidente.CERRADO},
                            personal_id=admin.id, fecha_hora=momento + timedelta(hours=1), motivo=correccion)

            carpeta = ARCHIVOS_DIR / "documentos-tecnicos"
            carpeta.mkdir(parents=True, exist_ok=True)
            for i, nombre in enumerate(DOCUMENTOS_TECNICOS):
                tipo = TipoDocumentoTecnico.MANUAL_BPM if i == 0 else TipoDocumentoTecnico.FICHA_TECNICA if i == 12 else TipoDocumentoTecnico.RECETA if i == 14 else TipoDocumentoTecnico.PROCEDIMIENTO
                documento, _ = crear(DocumentoTecnico, {"nombre": nombre}, descripcion=f"Documento de demostración para {SECTORES[i].lower()}.",
                    tipo=tipo, estado=EstadoDocumento.VIGENTE, fecha_creacion=datetime.combine(ayer, time(8, i)))
                nombre_archivo = f"seed-saia-documento-{i + 1:02d}.pdf"
                contenido = _pdf_certificado(nombre, ["DOCUMENTO DE DEMOSTRACION - SIN VALIDEZ OFICIAL",
                    f"Sector: {SECTORES[i]}", f"Equipo: {EQUIPOS[i]}", "Verificar higiene antes y despues de la operacion.",
                    "Registrar responsable, fecha y resultados del control.", "Aplicar la ficha del producto; no mezclar quimicos."])
                if not (carpeta / nombre_archivo).exists():
                    (carpeta / nombre_archivo).write_bytes(contenido)
                version, nueva = crear(VersionDocumentoTecnico, {"documento_id": documento.id, "numero": 1},
                    estado=EstadoDocumento.VIGENTE, archivo_nombre=nombre_archivo, nombre_original=nombre_archivo,
                    tipo_contenido="application/pdf", tamanio_bytes=len(contenido), comentario="Versión de prueba del seed",
                    fecha_subida=datetime.combine(ayer, time(8, i)), subido_por_id=admin.id)
                if nueva:
                    crear(CambioVigenciaDocumentoTecnico, {"documento_id": documento.id, "version_id": version.id},
                        version_anterior_id=None, personal_id=admin.id, fecha_vigencia=datetime.combine(ayer, time(8, i)))

            for i, equipo in enumerate(equipos):
                periodicidad = equipo.periodicidad_dias or 180
                antiguedad = [periodicidad + 10, periodicidad - 7, 15][i % 3]
                fecha = hoy - timedelta(days=antiguedad)
                archivo = f"seed-saia-calibracion-{i + 1:02d}.pdf"
                contenido = _pdf_certificado("Registro de verificacion de equipo", ["DEMOSTRACION - NO ES UN CERTIFICADO OFICIAL",
                    f"Equipo: {equipo.nombre}", f"Serie: {equipo.numero_serie}", f"Fecha: {fecha.isoformat()}",
                    "Responsable: Servicio de metrologia interno SAIA", "Resultado de ejemplo: verificacion satisfactoria."])
                destino = UPLOADS_DIR / archivo
                if not destino.exists():
                    destino.write_bytes(contenido)
                registro, nuevo = crear(RegistroCalibracion, {"certificado_path": f"/uploads/{archivo}"},
                    equipo_id=equipo.id, fecha_calibracion=fecha,
                    fecha_vencimiento_calculada=fecha + timedelta(days=periodicidad),
                    otorgado_por="Servicio de metrología interno SAIA", fecha_registro=datetime.combine(fecha, time(9)), activo=True)
                if nuevo:
                    equipo.fecha_ultima_calibracion = max([fecha, equipo.fecha_ultima_calibracion or fecha])

                plan, tarea, quimico, elemento = planes[i], tareas[i], quimicos[i], elementos[i]
                momento = datetime.combine(ayer, time(10, i))
                responsable = plan.responsable_id
                foto = fotos[1 if i == 11 else 2 if i in (4, 5) else 0]
                item, _ = crear(ItemChecklist, {"plan_id": plan.id, "tarea_id": tarea.id,
                    "frecuencia": FrecuenciaTarea.DIARIA, "periodo_inicio": ayer}, periodo_fin=ayer,
                    responsable_id=responsable, realizada_por_id=responsable, estado=EstadoItem.REALIZADA,
                    realizada_en=momento, foto_path=foto)
                crear(MovimientoItemChecklist, {"item_id": item.id, "accion": AccionMovimiento.REALIZADA},
                    personal_id=responsable, fecha_hora=momento, foto_path=foto)
                plan_realizado, _ = crear(PlanRealizado, {"plan_origen_id": plan.id, "fecha_ejecucion": momento},
                    nombre=plan.nombre, descripcion=plan.descripcion, responsable_id=responsable,
                    sector_id=plan.sector_id, equipo_id=equipo.id)
                crear(TareaRealizada, {"plan_realizado_id": plan_realizado.id, "tarea_origen_id": tarea.id},
                    nombre=tarea.nombre, frecuencia=tarea.frecuencia, procedimiento=tarea.procedimiento,
                    fecha_registro=momento, equipo_id=equipo.id, foto_path=foto,
                    elementos_utilizados=[{"id": elemento.id, "nombre": elemento.nombre}],
                    insumos_utilizados=[{"id": quimico.id, "nombre": quimico.nombre, "cantidad": 0.25}])
                crear(ConsumoQuimico, {"insumo_quimico_id": quimico.id, "fecha": ayer, "tarea_limpieza": tarea.nombre},
                    operario_id=responsable, cantidad_utilizada=0.25, activo=True)
                # Pendientes de hoy para probar el checklist sin consumir stock ni finalizar tareas.
                crear(ItemChecklist, {"plan_id": plan.id, "tarea_id": tarea.id,
                    "frecuencia": FrecuenciaTarea.DIARIA, "periodo_inicio": hoy}, periodo_fin=hoy,
                    responsable_id=responsable, estado=EstadoItem.PENDIENTE)
                #datos ficticios para el grafico de cumplimiento
                for dias_atras in range(2, 31):
                    fecha = hoy - timedelta(days=dias_atras)
                    fin_de_semana = fecha.weekday() >= 5
                    semana_baja = 14 <= dias_atras <= 20
                    cumplida = not ((fin_de_semana and i % 2 == 0) or (semana_baja and i % 3 == 0))
                    crear(ItemChecklist, {"plan_id": plan.id, "tarea_id": tarea.id,
                        "frecuencia": FrecuenciaTarea.DIARIA, "periodo_inicio": fecha}, periodo_fin=fecha,
                        responsable_id=responsable,
                        realizada_por_id=responsable if cumplida else None,
                        estado=EstadoItem.REALIZADA if cumplida else EstadoItem.PENDIENTE,
                        realizada_en=datetime.combine(fecha, time(10, i)) if cumplida else None)

            unidades_por_sufijo = {u.sufijo: u for u in unidades}
            productos = []
            for nombre, descripcion, sufijo in PRODUCTOS:
                producto, _ = crear(Producto, {"nombre": nombre}, descripcion=descripcion,
                    unidad_medida_id=unidades_por_sufijo[sufijo].id, activo=True)
                productos.append(producto)
            for i in range(CANTIDAD):
                fecha_lote = hoy - timedelta(days=[0, 1, 2, 3, 5, 7, 9, 12, 14, 17, 20, 23, 25, 28, 30][i])
                crear(LoteProduccion, {"codigo": f"L-SEED-{i + 1:03d}"},
                    producto_id=productos[i % len(productos)].id, fecha_produccion=fecha_lote,
                    cantidad=float([24, 15, 60, 30, 20, 8, 40, 12, 6, 36, 10, 5, 48, 9, 7][i]),
                    observaciones=None if i % 3 else "Lote de demostración del seed.",
                    registrado_por_id=operadores[i % len(operadores)].id,
                    fecha_registro=datetime.combine(fecha_lote, time(7 + i % 8, 30)), activo=True)

            db.flush()
            # Descubrir los modelos registrados evita olvidar entidades nuevas silenciosamente.
            conteos = {m.class_.__name__: db.scalar(select(func.count()).select_from(m.class_))
                for m in ModeloBase.registry.mappers}
            # TipoIncidente es un catálogo corto (6 activos + 1 dado de baja): se exige >= 1.
            faltantes = {nombre: total for nombre, total in conteos.items()
                if total < (1 if nombre == "TipoIncidente" else CANTIDAD)}
            if faltantes:
                raise RuntimeError(f"Modelos con menos de {CANTIDAD} registros: {faltantes}")
            db.commit()
            print("Seed SAIA cargado sin borrar ni modificar registros existentes.")
            for nombre in sorted(conteos):
                print(f"  {nombre}: {conteos[nombre]} totales; {resumen.get(nombre, 0)} nuevos")
            print("Fotografías de contexto reales; perfiles ficticios y documentos de demostración.")
            print(f"admin: {PASSWORD_ADMIN}; opera y nuevos perfiles: {PASSWORD_OPERARIO} (se conservan contraseñas existentes).")
        except Exception:
            db.rollback()
            raise


def comprobar_estructura():
    inspector = inspect(engine)

    if not inspector.has_table("incidentes"):
        return

    columnas = {
        columna["name"]
        for columna in inspector.get_columns("incidentes")
    }

    if "tipo_id" not in columnas or "tipo" in columnas:
        raise RuntimeError(
            "La base tiene una estructura vieja de incidentes. "
            "Usá una base nueva para pruebas o migrá la existente. "
            "El seed no modifica columnas ni elimina datos."
        )


if __name__ == "__main__":
    comprobar_estructura()
    cargar_seed()
