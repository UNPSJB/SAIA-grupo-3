"""Tipos de incidente, incidentes, acciones correctivas e historial."""

from datetime import datetime, time, timedelta

from src.accionCorrectiva.models import AccionCorrectiva
from src.incidente.auditoria import AccionMovimientoIncidente, MovimientoIncidente
from src.incidente.constants import EstadoIncidente
from src.incidente.models import Incidente
from src.tipoIncidente.models import TipoIncidente as ModeloTipoIncidente


TIPOS_INCIDENTE_OBLIGATORIOS = [("Higiene y limpieza", "info"), ("Plagas", "danger"),
    ("Equipos e instalaciones", "primary"), ("Producto / cliente", "success")]

TIPOS_INCIDENTE = TIPOS_INCIDENTE_OBLIGATORIOS + [
    ("Accidente", "warning"), ("Otros", "secondary")]

TIPO_INCIDENTE_INACTIVO = ("Reclamo de proveedor", "dark")

INCIDENTES_TIPO_INACTIVO = [
    ("Un proveedor entregó cajas de insumos con el embalaje dañado.", None, 5),
    ("Un proveedor entregó un lote sin la etiqueta de trazabilidad.",
     "Se devolvió el lote y se pidió al proveedor que lo reemplace etiquetado.", 20),
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


def cargar_incidentes(crear, personas, operadores, admin, hoy, fotos):
    tipos_obligatorios, tipos_activos = [], []
    for indice, (nombre_tipo, color) in enumerate(TIPOS_INCIDENTE):
        tipo_creado, _ = crear(ModeloTipoIncidente, {"nombre": nombre_tipo}, color=color, activo=True)
        tipos_activos.append(tipo_creado)
        if indice < len(TIPOS_INCIDENTE_OBLIGATORIOS):
            tipos_obligatorios.append(tipo_creado)
    nombre_inactivo, color_inactivo = TIPO_INCIDENTE_INACTIVO
    tipo_inactivo, _ = crear(ModeloTipoIncidente, {"nombre": nombre_inactivo},
        color=color_inactivo, activo=False)

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
