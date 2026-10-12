"""Carga datos de demostración de forma repetible y sin borrar datos.

Ejecutar desde backend/:  .venv/bin/python seed.py
"""
from __future__ import annotations

import struct
import zlib
from datetime import date, datetime, time, timedelta

from faker import Faker
from sqlalchemy import func, select

# Importar la app registra todos los modelos en la metadata SQLAlchemy.
from src.main import app  # noqa: F401
from src.config import UPLOADS_DIR
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
from src.incidente.models import Incidente
from src.incidente.constants import EstadoIncidente, TipoIncidente
from src.incidente.auditoria import AccionMovimientoIncidente, MovimientoIncidente, registrar_movimiento
from src.accionCorrectiva.models import AccionCorrectiva
from src.registroCalibracion.models import RegistroCalibracion
from src.checklist.models import ItemChecklist, EstadoItem, MovimientoItemChecklist, AccionMovimiento
from src.planRealizado.models import PlanRealizado
from src.tareaRealizada.models import TareaRealizada
from src.consumoQuimico.models import ConsumoQuimico
from src.notificaciones.services import generar_aviso_vencimientos

fake = Faker("es_AR")
Faker.seed(20261005)

CANTIDAD = 15
PASSWORD_ADMIN = "admin123"
PASSWORD_OPERARIO = "opera123"


def obtener_o_crear(db, modelo, filtros: dict, valores: dict):
    registro = db.scalar(select(modelo).filter_by(**filtros))
    creado = registro is None
    if creado:
        registro = modelo(**filtros, **valores)
        db.add(registro)
        db.flush()
    else:
        for clave, valor in valores.items():
            setattr(registro, clave, valor)
    return registro, creado


def crear_personal(db):
    """Garantiza los usuarios de users.py y completa 15 personas de prueba."""
    hashes = {
        "admin": get_password_hash(PASSWORD_ADMIN),
        "operario": get_password_hash(PASSWORD_OPERARIO),
    }
    especificaciones = [
        {
            "username": "admin",
            "nombre": "Administrador",
            "apellido": "SAIA",
            "dni": "99999999",
            "nroLegajo": "ADMIN01",
            "email": "admin@saia.com",
            "operar": True,
            "administrar": True,
            "hashed_password": hashes["admin"],
            "activo": True,
        },
        {
            "username": "opera",
            "nombre": "Operador",
            "apellido": "SAIA",
            "dni": "40123456",
            "nroLegajo": "OPE002",
            "email": "maria.gomez@ejemplo.com",
            "operar": True,
            "administrar": False,
            "hashed_password": hashes["operario"],
            "activo": True,
        },
    ]
    for numero in range(3, CANTIDAD + 1):
        username = f"operario.demo{numero - 2:02d}"
        especificaciones.append({
            "username": username,
            "nombre": fake.first_name(),
            "apellido": fake.last_name(),
            "dni": f"990000{numero - 1:04d}",
            "nroLegajo": f"DEMO-{numero - 1:04d}",
            "email": f"{username}@example.com",
            "operar": True,
            "administrar": False,
            "hashed_password": hashes["operario"],
            "activo": True,
        })

    usuarios = []
    for valores in especificaciones:
        username = valores.pop("username")
        persona, _ = obtener_o_crear(db, Personal, {"username": username}, valores)
        usuarios.append(persona)
    return usuarios


# ---------------------------------------------------------------------------
# Calibraciones: archivos de evidencia de ejemplo (PDF y foto PNG)
# ---------------------------------------------------------------------------

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


def _png_foto(color: tuple[int, int, int], ancho: int = 320, alto: int = 200) -> bytes:
    """Genera una imagen PNG simple (fondo claro con una franja de color) que simula una foto."""
    filas = bytearray()
    for y in range(alto):
        filas.append(0)  # filtro "None" por fila
        for x in range(ancho):
            en_franja = alto // 3 <= y < 2 * alto // 3 and ancho // 8 <= x < 7 * ancho // 8
            filas += bytes(color if en_franja else (240, 240, 240))

    def chunk(tipo: bytes, datos: bytes) -> bytes:
        return (
            struct.pack(">I", len(datos)) + tipo + datos
            + struct.pack(">I", zlib.crc32(tipo + datos) & 0xFFFFFFFF)
        )

    return (
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", struct.pack(">IIBBBBB", ancho, alto, 8, 2, 0, 0, 0))
        + chunk(b"IDAT", zlib.compress(bytes(filas), 9))
        + chunk(b"IEND", b"")
    )


def _guardar_evidencia(nombre_archivo: str, contenido: bytes) -> str:
    """Escribe el archivo en uploads/ con un nombre fijo, así el seed se puede correr varias veces."""
    UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
    (UPLOADS_DIR / nombre_archivo).write_bytes(contenido)
    return f"/uploads/{nombre_archivo}"


def cargar_calibraciones(db, equipos: list, hoy: date) -> dict:
    """Configura periodicidades y un historial de calibraciones que cubre todos los casos de prueba.

    Cada escenario es: (índice del equipo, periodicidad en días o None,
    [(días atrás, otorgado por, formato, activo), ...]).
    """
    laboratorios = [
        "INTI - Metrología",
        "Laboratorio Calibrar SRL",
        "Metrología del Litoral",
        "Servicio Técnico Oficial",
    ]
    escenarios = [
        # 1-3: historial de 3 calibraciones anuales, la última vigente (mezcla PDF y foto)
        (0, 365, [(700, laboratorios[0], "pdf", True), (340, laboratorios[1], "png", True), (30, laboratorios[0], "pdf", True)]),
        (1, 365, [(720, laboratorios[2], "png", True), (360, laboratorios[2], "pdf", True), (15, laboratorios[1], "png", True)]),
        (2, 365, [(400, laboratorios[3], "pdf", True), (45, laboratorios[3], "pdf", True)]),
        # 4-5: periodicidad semestral con la última calibración VENCIDA
        (3, 180, [(390, laboratorios[1], "pdf", True), (200, laboratorios[1], "png", True)]),
        (4, 180, [(210, laboratorios[2], "pdf", True)]),
        # 6: trimestral, vence en 10 días (por vencer)
        (5, 90, [(80, laboratorios[0], "png", True)]),
        # 7: sin periodicidad -> la tabla muestra "Sin periodicidad"
        (6, None, [(60, laboratorios[3], "pdf", True)]),
        # 8: con periodicidad pero SIN calibraciones -> para probar "Registrar Calibración" desde cero
        (7, 365, []),
        # 9: tiene una calibración dada de baja (no debe aparecer) y una activa
        (8, 365, [(100, laboratorios[1], "pdf", False), (20, laboratorios[2], "png", True)]),
    ]
    colores = [(46, 125, 50), (21, 101, 192), (239, 108, 0), (106, 27, 154)]
    resumen = {"registros": 0, "pdf": 0, "fotos": 0, "dados_de_baja": 0}

    for indice, periodicidad, calibraciones in escenarios:
        equipo = equipos[indice]
        equipo.periodicidad_dias = periodicidad
        fechas_activas = []

        for orden, (dias_atras, otorgado_por, formato, activo) in enumerate(calibraciones, start=1):
            fecha = hoy - timedelta(days=dias_atras)
            nombre_archivo = f"seed-calibracion-{equipo.numero_serie.lower()}-{orden}.{formato}"
            if formato == "pdf":
                contenido = _pdf_certificado(
                    "Certificado de Calibracion",
                    [
                        f"Equipo: {equipo.nombre}",
                        f"N de serie: {equipo.numero_serie}",
                        f"Fecha de calibracion: {fecha.strftime('%d/%m/%Y')}",
                        f"Otorgado por: {otorgado_por}",
                        "Documento de prueba generado por seed.py",
                    ],
                )
                resumen["pdf"] += 1
            else:
                contenido = _png_foto(colores[(indice + orden) % len(colores)])
                resumen["fotos"] += 1
            certificado_path = _guardar_evidencia(nombre_archivo, contenido)

            obtener_o_crear(
                db, RegistroCalibracion,
                {"certificado_path": certificado_path},
                {
                    "equipo_id": equipo.id,
                    "fecha_calibracion": fecha,
                    "fecha_vencimiento_calculada": (
                        fecha + timedelta(days=periodicidad) if periodicidad else None
                    ),
                    "otorgado_por": otorgado_por,
                    "fecha_registro": datetime.combine(fecha, time(hour=9)),
                    "activo": activo,
                },
            )
            resumen["registros"] += 1
            if activo:
                fechas_activas.append(fecha)
            else:
                resumen["dados_de_baja"] += 1

        # Igual que el service: la última calibración del equipo sale del historial activo
        equipo.fecha_ultima_calibracion = max(fechas_activas) if fechas_activas else None

    db.flush()
    return resumen


def cargar_historial_incidentes(db, incidentes: list, admin, ayer: date) -> bool:
    """Deja un incidente en cada situación para probar acción correctiva y auditoría:

    1. abierto (recién reportado)            -> para registrar una acción correctiva
    2. cerrado con su acción correctiva      -> para reabrirlo o corregir la acción
    3. cerrado y después reabierto           -> historial completo + acción no vigente

    Solo se carga la primera vez (si el incidente no tiene movimientos), así correr
    el seed de nuevo no duplica el historial ni pisa lo que se haya probado a mano.
    """
    if db.scalar(select(func.count()).select_from(MovimientoIncidente)) > 0:
        return False

    def movimiento(incidente, accion, personal, hora, motivo=None):
        registro = registrar_movimiento(db, incidente.id, accion, personal.id, motivo)
        registro.fecha_hora = datetime.combine(ayer, time(hour=hora))

    def accion_correctiva(incidente, descripcion, hora, vigente):
        db.add(AccionCorrectiva(
            incidente_id=incidente.id,
            descripcion=descripcion,
            responsable_id=admin.id,
            fecha_cierre=datetime.combine(ayer, time(hour=hora)),
            vigente=vigente,
        ))

    for incidente in incidentes:
        reportante = db.scalar(select(Personal).where(Personal.dni == incidente.reportado_por_dni))
        movimiento(incidente, AccionMovimientoIncidente.REPORTADO, reportante, incidente.fecha_hora.hour)

    abierto, cerrado, reabierto = incidentes

    abierto.estado = EstadoIncidente.ABIERTO

    texto = "Se contrató fumigación del depósito y se sellaron las aberturas detectadas."
    accion_correctiva(cerrado, texto, 15, vigente=True)
    movimiento(cerrado, AccionMovimientoIncidente.CERRADO, admin, 15, texto)
    cerrado.estado = EstadoIncidente.CERRADO

    texto = "Se retiró el lote observado y se avisó al proveedor de envases."
    accion_correctiva(reabierto, texto, 16, vigente=False)
    movimiento(reabierto, AccionMovimientoIncidente.CERRADO, admin, 16, texto)
    movimiento(
        reabierto, AccionMovimientoIncidente.REABIERTO, admin, 18,
        "El proveedor confirmó que el problema afecta también a otro lote.",
    )
    reabierto.estado = EstadoIncidente.ABIERTO

    db.flush()
    return True


def quitar_etiquetas_anteriores(db) -> None:
    """Limpia los nombres del seed anterior sin borrar registros ni relaciones."""
    prefijo = "[DEMO SAIA] "
    campos = [
        (Sector, "nombre"), (Equipo, "nombre"), (Insumo, "nombre"),
        (InsumoQuimico, "nombre"), (Elemento, "nombre"), (Tarea, "nombre"),
        (Plan, "nombre"),
        (PlanRealizado, "nombre"), (TareaRealizada, "nombre"),
        (ConsumoQuimico, "tarea_limpieza"),
    ]
    for modelo, campo in campos:
        for registro in db.scalars(select(modelo)).all():
            valor = getattr(registro, campo, None)
            if isinstance(valor, str) and valor.startswith(prefijo):
                setattr(registro, campo, valor[len(prefijo):])
    for tarea in db.scalars(select(Tarea)).all():
        if tarea.procedimiento:
            tarea.procedimiento = tarea.procedimiento.replace(prefijo, "")
    db.flush()


def cargar_seed() -> None:
    ModeloBase.metadata.create_all(bind=engine)
    hoy = date.today()
    ayer = hoy - timedelta(days=1)

    with SessionLocal() as db:
        try:
            quitar_etiquetas_anteriores(db)
            personas = crear_personal(db)

            definiciones_unidad = [
                (TipoUnidadMedida.UNIDAD, "un"),
                (TipoUnidadMedida.UNIDAD, "par"),
                (TipoUnidadMedida.UNIDAD, "caja"),
                (TipoUnidadMedida.UNIDAD, "paquete"),
                (TipoUnidadMedida.UNIDAD, "rollo"),
                (TipoUnidadMedida.PESO, "mg"),
                (TipoUnidadMedida.PESO, "g"),
                (TipoUnidadMedida.PESO, "kg"),
                (TipoUnidadMedida.PESO, "lb"),
                (TipoUnidadMedida.CAPACIDAD, "ml"),
                (TipoUnidadMedida.CAPACIDAD, "L"),
                (TipoUnidadMedida.CAPACIDAD, "cc"),
                (TipoUnidadMedida.CAPACIDAD, "gal"),
                (TipoUnidadMedida.LONGITUD, "cm"),
                (TipoUnidadMedida.LONGITUD, "m"),
            ]
            unidades = []
            for tipo, sufijo in definiciones_unidad:
                unidad, _ = obtener_o_crear(
                    db, UnidadMedida, {"sufijo": sufijo},
                    {"tipo": tipo, "activo": True},
                )
                unidades.append(unidad)

            sectores = []
            for numero in range(1, CANTIDAD + 1):
                sector, _ = obtener_o_crear(
                    db, Sector,
                    {"nombre": f"Sector {numero:02d}"},
                    {"activo": True},
                )
                sectores.append(sector)

            equipos = []
            tipos_equipo = list(TipoEquipo)
            for numero in range(1, CANTIDAD + 1):
                equipo, _ = obtener_o_crear(
                    db, Equipo,
                    {"numero_serie": f"DEMO-EQ-{numero:04d}"},
                    {
                        "nombre": f"{fake.word().capitalize()} {numero:02d}",
                        "tipo": tipos_equipo[(numero - 1) % len(tipos_equipo)],
                        "activo": True,
                        "sector_id": sectores[numero - 1].id,
                    },
                )
                equipos.append(equipo)

            insumos = []
            for numero in range(1, CANTIDAD + 1):
                unidad = unidades[(numero - 1) % len(unidades)]
                insumo, _ = obtener_o_crear(
                    db, Insumo,
                    {"nombre": f"Insumo general {numero:02d}"},
                    {
                        "cantidad": float(100 + numero * 7),
                        "unidad_medida_id": unidad.id,
                        "activo": True,
                    },
                )
                insumos.append(insumo)

            quimicos = []
            tipos_quimicos = list(TipoQuimico)
            unidades_capacidad = [
                unidad for unidad in unidades
                if unidad.tipo == TipoUnidadMedida.CAPACIDAD
            ]
            for numero in range(1, CANTIDAD + 1):
                unidad = unidades_capacidad[(numero - 1) % len(unidades_capacidad)]
                quimico, _ = obtener_o_crear(
                    db, InsumoQuimico,
                    {"nombre": f"Químico {numero:02d}"},
                    {
                        "cantidad": float(100 + numero * 10),
                        "tipo_quimico": tipos_quimicos[(numero - 1) % len(tipos_quimicos)],
                        "activo": True,
                        "unidad_medida_id": unidad.id,
                    },
                )
                quimicos.append(quimico)

            elementos = []
            for numero in range(1, CANTIDAD + 1):
                elemento, _ = obtener_o_crear(
                    db, Elemento,
                    {"nombre": f"Elemento de limpieza {numero:02d}"},
                    {
                        "frecuencia_recambio": 30 + (numero % 6) * 15,
                        "fecha_ultimo_recambio": ayer,
                        "fecha_proximo_recambio": hoy + timedelta(days=30 + numero),
                        "activo": True,
                    },
                )
                elementos.append(elemento)

            tareas = []
            for numero in range(1, CANTIDAD + 1):
                nombre_tarea = f"Tarea diaria {numero:02d}"
                tarea, _ = obtener_o_crear(
                    db, Tarea, {"nombre": nombre_tarea},
                    {
                        "frecuencia": FrecuenciaTarea.DIARIA,
                        "procedimiento": (
                            "Limpiar y desinfectar la zona asignada. "
                            f"Revisar el elemento de limpieza {numero:02d} y registrar "
                            "el consumo real del químico usado."
                        ),
                        "equipo_id": equipos[numero - 1].id,
                    },
                )
                tarea.frecuencia = FrecuenciaTarea.DIARIA
                tarea.equipo_id = equipos[numero - 1].id
                tarea.elementos = [elementos[numero - 1]]

                requisito = next(
                    (r for r in tarea.insumos_quimicos
                     if r.insumo_quimico_id == quimicos[numero - 1].id),
                    None,
                )
                if requisito is None:
                    tarea.insumos_quimicos.append(
                        TareaInsumoQuimico(
                            insumo_quimico_id=quimicos[numero - 1].id,
                            cantidad=1.5 + (numero % 4) * 0.5,
                        )
                    )
                else:
                    requisito.cantidad = 1.5 + (numero % 4) * 0.5
                tareas.append(tarea)

            planes = []
            operadores = personas[1:]
            for numero in range(1, CANTIDAD + 1):
                operador = personas[1]
                nombre_plan = f"Plan POES {numero:02d}"
                plan, _ = obtener_o_crear(
                    db, Plan,
                    {"nombre": nombre_plan},
                    {
                        "responsable_id": operador.id,
                        "descripcion": f"Plan de prueba diario {numero:02d} generado con Faker.",
                        "activo": True,
                        "fecha_inicio": ayer,
                        "fecha_fin": None,
                        "sector_id": sectores[(numero - 1) % CANTIDAD].id,
                        "equipo_id": equipos[(numero - 1) % CANTIDAD].id,
                    },
                )
                plan.activo = True
                plan.fecha_inicio = ayer
                plan.fecha_fin = None
                plan.sector_id = sectores[(numero - 1) % CANTIDAD].id
                plan.equipo_id = equipos[(numero - 1) % CANTIDAD].id
                if tareas[numero - 1] not in plan.tareas:
                    plan.tareas.append(tareas[numero - 1])
                planes.append(plan)

            tipos_documento = []
            for nombre in ["Carnet de manipulador", "Libreta sanitaria", "Apto psicofísico", "Certificado de salud", "Capacitación"]:
                tipo, _ = obtener_o_crear(db, TipoDocumento, {"nombre": nombre}, {"activo": True})
                tipos_documento.append(tipo)
            for numero in range(1, CANTIDAD + 1):
                operador = operadores[(numero - 1) % len(operadores)]
                tipo = tipos_documento[(numero - 1) % len(tipos_documento)]
                obtener_o_crear(db, Documentacion,
                    {"personal_id": operador.id, "tipo_documento_id": tipo.id},
                    {"fecha_vencimiento": hoy + timedelta(days=(-7, 7, 60)[(numero - 1) % 3])})
            incidentes = []
            for numero, (descripcion, tipo) in enumerate([
                ("Se detectó una pérdida de agua debajo de la pileta del área de lavado.", TipoIncidente.EQUIPOS),
                ("Se observó presencia de insectos en el sector de almacenamiento.", TipoIncidente.PLAGAS),
                ("Un cliente devolvió un producto por inconvenientes con el envase.", TipoIncidente.PRODUCTO),
            ]):
                incidente, _ = obtener_o_crear(db, Incidente, {"descripcion": descripcion},
                    {"reportado_por_dni": operadores[numero].dni,
                     "tipo": tipo,
                     "fecha_hora": datetime.combine(ayer, time(hour=10 + numero))})
                incidentes.append(incidente)
            historial_incidentes_cargado = cargar_historial_incidentes(
                db, incidentes, personas[0], ayer
            )

            resumen_calibraciones = cargar_calibraciones(db, equipos, hoy)

            db.flush()

            # Datos de ayer para que el historial y el reporte no aparezcan vacíos.
            for numero, plan in enumerate(planes, start=1):
                tarea = tareas[numero - 1]
                operador = personas[1]
                quimico = quimicos[numero - 1]
                momento = datetime.combine(ayer, time(hour=10, minute=numero % 60))

                item = db.scalar(
                    select(ItemChecklist).where(
                        ItemChecklist.plan_id == plan.id,
                        ItemChecklist.tarea_id == tarea.id,
                        ItemChecklist.periodo_inicio == ayer,
                    )
                )
                if item is None:
                    item = ItemChecklist(
                        plan_id=plan.id,
                        tarea_id=tarea.id,
                        responsable_id=operador.id,
                        realizada_por_id=operador.id,
                        frecuencia=FrecuenciaTarea.DIARIA,
                        periodo_inicio=ayer,
                        periodo_fin=ayer,
                        estado=EstadoItem.REALIZADA,
                        realizada_en=momento,
                    )
                    db.add(item)
                else:
                    item.responsable_id = operador.id
                    item.realizada_por_id = operador.id
                    item.estado = EstadoItem.REALIZADA
                    item.realizada_en = momento
                db.flush()

                movimiento = db.scalar(
                    select(MovimientoItemChecklist).where(
                        MovimientoItemChecklist.item_id == item.id,
                        MovimientoItemChecklist.accion == AccionMovimiento.REALIZADA,
                    )
                )
                if movimiento is None:
                    db.add(MovimientoItemChecklist(
                        item_id=item.id,
                        accion=AccionMovimiento.REALIZADA,
                        personal_id=operador.id,
                        fecha_hora=momento,
                    ))
                else:
                    movimiento.personal_id = operador.id
                    movimiento.fecha_hora = momento

                plan_realizado = db.scalar(
                    select(PlanRealizado).where(
                        PlanRealizado.plan_origen_id == plan.id,
                        func.date(PlanRealizado.fecha_ejecucion) == ayer.isoformat(),
                    )
                )
                if plan_realizado is None:
                    plan_realizado = PlanRealizado(
                        plan_origen_id=plan.id,
                        nombre=plan.nombre,
                        descripcion=plan.descripcion,
                        fecha_ejecucion=momento,
                        responsable_id=operador.id,
                        sector_id=plan.sector_id,
                        equipo_id=plan.equipo_id,
                    )
                    db.add(plan_realizado)
                    db.flush()
                else:
                    plan_realizado.nombre = plan.nombre
                    plan_realizado.descripcion = plan.descripcion
                    plan_realizado.responsable_id = operador.id
                    plan_realizado.sector_id = plan.sector_id
                    plan_realizado.equipo_id = plan.equipo_id

                tarea_realizada = db.scalar(
                    select(TareaRealizada).where(
                        TareaRealizada.plan_realizado_id == plan_realizado.id,
                        TareaRealizada.tarea_origen_id == tarea.id,
                    )
                )
                if tarea_realizada is None:
                    tarea_realizada = TareaRealizada(
                        plan_realizado_id=plan_realizado.id,
                        tarea_origen_id=tarea.id,
                        nombre=tarea.nombre,
                        frecuencia=tarea.frecuencia,
                        procedimiento=tarea.procedimiento,
                        fecha_registro=momento,
                        equipo_id=tarea.equipo_id,
                        elementos_utilizados=[{"id": elementos[numero - 1].id,
                                               "nombre": elementos[numero - 1].nombre}],
                        insumos_utilizados=[{"id": quimico.id, "cantidad": 1.0}],
                    )
                    db.add(tarea_realizada)

                nombre_consumo = f"Tarea diaria {numero:02d}"
                consumo = db.scalar(
                    select(ConsumoQuimico).where(
                        ConsumoQuimico.insumo_quimico_id == quimico.id,
                        ConsumoQuimico.fecha == ayer,
                        ConsumoQuimico.tarea_limpieza == nombre_consumo,
                    )
                )
                if consumo is None:
                    db.add(ConsumoQuimico(
                        insumo_quimico_id=quimico.id,
                        cantidad_utilizada=1.0,
                        fecha=ayer,
                        tarea_limpieza=nombre_consumo,
                        operario_id=operador.id,
                        activo=True,
                    ))
                else:
                    consumo.operario_id = operador.id
                    consumo.cantidad_utilizada = 1.0
                    consumo.activo = True

            db.commit()
            aviso = generar_aviso_vencimientos(db, hoy)
            if aviso is not None:
                # Permite volver a probar la campanita aunque el aviso ya se haya leído.
                aviso.leida = False
                db.commit()

            print("Seed SAIA cargado correctamente. No se borraron datos.")
            print("Se crearon/actualizaron 15 registros por catálogo principal y 15 registros históricos.")
            print(f"Administrador: admin / {PASSWORD_ADMIN}")
            print(f"Operario con 15 tareas diarias: opera / {PASSWORD_OPERARIO}")
            print("El checklist de hoy se genera al abrirlo; ayer queda cargado para el historial.")
            print("Documentos de prueba: 5 vencidos hace 7 días, 5 por vencer en 7 días y 5 vigentes por 60 días.")
            print(
                f"Calibraciones: {resumen_calibraciones['registros']} registros "
                f"({resumen_calibraciones['pdf']} PDF, {resumen_calibraciones['fotos']} fotos, "
                f"{resumen_calibraciones['dados_de_baja']} dado de baja) en {UPLOADS_DIR}."
            )
            print("  DEMO-EQ-0001 a 0003: historial anual con la última vigente.")
            print("  DEMO-EQ-0004 y 0005: última calibración vencida.")
            print("  DEMO-EQ-0006: vence en 10 días.")
            print("  DEMO-EQ-0007: sin periodicidad (no calcula vencimiento).")
            print("  DEMO-EQ-0008: sin calibraciones, para probar el alta desde cero.")
            print("  DEMO-EQ-0009: tiene una calibración dada de baja que no debe aparecer.")
            if historial_incidentes_cargado:
                print("Incidentes: 1 abierto, 1 cerrado con acción correctiva y 1 reabierto (con historial completo).")
            else:
                print("Incidentes: el historial ya estaba cargado, no se modificó.")
            if aviso is not None:
                print(f"Campanita: aviso de hoy disponible y no leído. {aviso.mensaje}")
            else:
                print("Campanita: no se generó un aviso; no hay documentos vencidos o por vencer.")
        except Exception:
            db.rollback()
            raise


if __name__ == "__main__":
    cargar_seed()