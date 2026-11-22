from src.equipos.models import TipoEquipo
from src.insumosQuimicos.models import TipoQuimico
from src.nutricion.constants import Nutriente
from src.rotuladoFrontal.constants import Hecho
from src.tarea.models import FrecuenciaTarea

EMPRESA = "Panificadora La Espiga Dorada S.R.L."
DOMICILIO = "Calle 14 N.º 1450, Parque Industrial, Luján, Buenos Aires"
NUMERO_ESTABLECIMIENTO = "02-034517"
DOMINIO_EMAIL = "laespigadorada.example"

PERSONAL = [
    ("admin", "Laura", "Benítez", "27884512", True, True, True, "admin"),
    ("admin.solo", "Ricardo", "Ferrari", "22154789", False, True, True, "opera"),
    ("opera", "Marcelo", "Ruiz", "25478963", True, False, True, "opera"),
    ("sebastian.luna", "Sebastián", "Luna", "33698741", True, False, True, "opera"),
    ("jorge.medina", "Jorge", "Medina", "29874561", True, False, True, "opera"),
    ("claudia.sosa", "Claudia", "Sosa", "31245789", True, False, True, "opera"),
    ("romina.vera", "Romina", "Vera", "36547821", True, False, True, "opera"),
    ("patricia.ibarra", "Patricia", "Ibarra", "28963214", True, False, True, "opera"),
    ("lucas.molina", "Lucas", "Molina", "38741256", True, False, True, "opera"),
    ("sin.permisos", "Tomás", "Quiroga", "40125478", False, False, True, "opera"),
    ("inactivo.demo", "Hernán", "Paz", "26985412", True, False, False, "opera"),
]

SECTORES = {
    "REC": "Recepción de materias primas",
    "SEC": "Depósito de materias primas secas",
    "FRI": "Cámara de frío",
    "AMA": "Cuadra de amasado",
    "FER": "Cámara de fermentación",
    "HOR": "Sector de hornos",
    "FAC": "Facturas y hojaldre",
    "ENF": "Enfriamiento y rebanado",
    "ENV": "Envasado y rotulado",
    "EXP": "Expedición",
    "LAV": "Lavado de utensilios y bandejas",
    "VES": "Vestuarios y sanitarios",
    "RES": "Depósito de residuos",
    "LIM": "Depósito de productos de limpieza",
}

EQUIPOS = [
    ("balanza_recepcion", "Balanza de plataforma 300 kg", TipoEquipo.INSTRUMENTO, "REC", 365, None),
    ("termohigrometro", "Termohigrómetro del depósito de secos", TipoEquipo.INSTRUMENTO, "SEC", 365, None),
    ("camara_frio", "Cámara frigorífica de materias primas", TipoEquipo.EQUIPO, "FRI", None, (0.0, 5.0)),
    ("freezer_masas", "Freezer de masas congeladas", TipoEquipo.EQUIPO, "FRI", None, (-22.0, -16.0)),
    ("amasadora_1", "Amasadora espiral 120 kg N.º 1", TipoEquipo.EQUIPO, "AMA", None, None),
    ("amasadora_2", "Amasadora espiral 80 kg N.º 2", TipoEquipo.EQUIPO, "AMA", None, None),
    ("sobadora", "Sobadora de rodillos", TipoEquipo.EQUIPO, "AMA", None, None),
    ("divisora", "Divisora boleadora", TipoEquipo.EQUIPO, "AMA", None, None),
    ("balanza_amasado", "Balanza de mesa 30 kg", TipoEquipo.INSTRUMENTO, "AMA", 180, None),
    ("camara_leudado", "Cámara de leudado controlado", TipoEquipo.EQUIPO, "FER", None, (28.0, 36.0)),
    ("horno_rotativo_1", "Horno rotativo a gas N.º 1", TipoEquipo.EQUIPO, "HOR", None, None),
    ("horno_rotativo_2", "Horno rotativo a gas N.º 2", TipoEquipo.EQUIPO, "HOR", None, None),
    ("horno_piso", "Horno de piso de 4 cámaras", TipoEquipo.EQUIPO, "HOR", None, None),
    ("termometro_pinche", "Termómetro de pinche digital", TipoEquipo.INSTRUMENTO, "HOR", 180, None),
    ("laminadora", "Laminadora de masa", TipoEquipo.EQUIPO, "FAC", None, None),
    ("batidora", "Batidora planetaria 40 L", TipoEquipo.EQUIPO, "FAC", None, None),
    ("rebanadora", "Rebanadora de pan de molde", TipoEquipo.EQUIPO, "ENF", None, None),
    ("moledora", "Moledora de pan rallado", TipoEquipo.EQUIPO, "ENF", None, None),
    ("carros", "Carros de enfriamiento", TipoEquipo.HERRAMIENTA, "ENF", None, None),
    ("embolsadora", "Embolsadora con cierre de clip", TipoEquipo.EQUIPO, "ENV", None, None),
    ("balanza_envasado", "Balanza de control de peso", TipoEquipo.INSTRUMENTO, "ENV", 180, None),
    ("pileta_lavado", "Pileta triple para lavado de bandejas", TipoEquipo.HERRAMIENTA, "LAV", None, None),
]

CALIBRACIONES = {
    "balanza_recepcion": 300,
    "termohigrometro": 372,
    "balanza_amasado": 171,
    "termometro_pinche": 40,
    "balanza_envasado": 96,
}

INSUMOS_GENERALES = [
    ("Bolsas impresas para pan de molde", "un", 3000.0, 2500.0, 30),
    ("Bolsas de papel madera para pan", "un", 2000.0, 1500.0, 30),
    ("Bolsas para pan de miga", "un", 800.0, 300.0, 30),
    ("Bolsas para prepizza", "un", 1200.0, 400.0, 30),
    ("Cajas de cartón para facturas", "un", 1500.0, 600.0, 30),
    ("Etiquetas autoadhesivas de rotulado", "rollo", 40.0, 10.0, 30),
    ("Clips de cierre para bolsas", "un", 10000.0, 3000.0, 30),
    ("Papel separador para tapas de empanada", "un", 4000.0, 1500.0, 30),
    ("Cofias descartables", "un", 1000.0, 200.0, 30),
    ("Guantes de nitrilo", "un", 2000.0, 400.0, 30),
    ("Barbijos descartables", "un", 150.0, 200.0, 30),
    ("Papel para secado de manos", "rollo", 60.0, 20.0, 30),
    ("Bolsas de residuos 60 x 90 cm", "un", 600.0, 150.0, 30),
]

INGREDIENTES = [
    ("Harina de trigo 000", "kg", "harina de trigo enriquecida (Ley 25.630)", None, 180, 7, 25.0, "molino"),
    ("Harina de trigo 0000", "kg", "harina de trigo enriquecida (Ley 25.630)", None, 180, 7, 25.0, "molino"),
    ("Harina de trigo integral", "kg", "harina de trigo integral", None, 90, 14, 25.0, "molino"),
    ("Agua", "L", "agua", 1.0, 30, 28, 1000.0, "agua"),
    ("Levadura fresca", "kg", "levadura", None, 28, 7, 0.5, "levadura"),
    ("Sal fina", "kg", "sal", None, 720, 28, 25.0, "granero"),
    ("Azúcar", "kg", "azúcar", None, 720, 14, 50.0, "granero"),
    ("Grasa vacuna refinada", "kg", "grasa vacuna", None, 120, 14, 20.0, "grasas"),
    ("Margarina para hojaldre", "kg", "margarina", None, 90, 14, 10.0, "aceitera"),
    ("Manteca", "kg", "manteca", None, 60, 7, 5.0, "lacteos"),
    ("Leche en polvo entera", "kg", "leche entera en polvo", None, 365, 28, 25.0, "granero"),
    ("Huevo líquido pasteurizado", "kg", "huevo entero pasteurizado", 1.03, 21, 7, 10.0, "granja"),
    ("Extracto de malta", "kg", "extracto de malta", None, 365, 28, 5.0, "levadura"),
    ("Aceite de girasol", "L", "aceite de girasol", 0.92, 365, 28, 20.0, "aceitera"),
    ("Salvado de trigo", "kg", "salvado de trigo", None, 120, 14, 10.0, "granero"),
    ("Semillas de sésamo", "kg", "semillas de sésamo", None, 180, 28, 5.0, "granero"),
    ("Dulce de membrillo", "kg", "dulce de membrillo", None, 180, 14, 5.0, "dulces"),
    ("Dulce de leche repostero", "kg", "dulce de leche", None, 90, 14, 10.0, "lacteos"),
    ("Puré de tomate", "kg", "puré de tomate", 1.05, 365, 14, 10.0, "conservas"),
]

STOCK_MINIMO_INGREDIENTES = {
    "Harina de trigo 000": 400.0,
    "Levadura fresca": 15.0,
    "Huevo líquido pasteurizado": 20.0,
    "Semillas de sésamo": 30.0,
    "Manteca": 25.0,
}

PROVEEDORES = {
    "molino": ("Molino Harinero San Andrés S.A.", "MSA", 210, True),
    "levadura": ("Levaduras del Plata S.R.L.", "LDP", 25, True),
    "granero": ("Distribuidora Mayorista El Granero S.A.", "GRA", 120, True),
    "grasas": ("Grasas y Derivados La Pampeana S.A.", "GLP", 300, True),
    "lacteos": ("Lácteos Valle Verde S.A.", "LVV", -6, True),
    "granja": ("Granja Avícola Los Robles", "GLR", 60, True),
    "aceitera": ("Aceitera del Sudoeste S.A.", "ASO", 180, True),
    "dulces": ("Dulces Regionales Doña Elsa S.R.L.", "DDE", 90, True),
    "conservas": ("Conservas Hortícolas del Valle S.A.", "CHV", 150, True),
    "aditivos": ("Aditivos Alimentarios Pampa S.R.L.", "AAP", 45, True),
    "envases": ("Envases y Embalajes del Oeste S.A.", "EEO", 365, True),
    "higiene": ("Higiene Institucional Norte S.R.L.", "HIN", 200, True),
    "agua": ("Cooperativa de Agua y Servicios de Luján Oeste", "CAS", 330, True),
    "harinera_vieja": ("Distribuidora Harinera Santa Fe S.R.L.", "DHS", -90, False),
}

ADITIVOS_RECEPCION = {
    "Sorbato de potasio en polvo": (1000.0, 365),
    "Propionato de calcio en polvo": (5000.0, 365),
    "Lecitina de soja líquida": (1000.0, 365),
    "Polvo de hornear (bicarbonato)": (2000.0, 365),
    "Esencia de vainilla": (1000.0, 540),
    "Mejorador panificador (ácido ascórbico)": (5000.0, 270),
}

QUIMICOS = [
    ("Detergente desengrasante alcalino", TipoQuimico.DESENGRASANTE, 38.0, 10.0),
    ("Detergente neutro", TipoQuimico.DETERGENTE, 26.0, 8.0),
    ("Hipoclorito de sodio 55 g/L", TipoQuimico.DESINFECTANTE, 44.0, 15.0),
    ("Sanitizante de amonio cuaternario", TipoQuimico.DESINFECTANTE, 18.0, 6.0),
    ("Alcohol 70 %", TipoQuimico.DESINFECTANTE, 12.0, 5.0),
    ("Limpiador de hornos", TipoQuimico.DESENGRASANTE, 9.0, 4.0),
    ("Desincrustante ácido", TipoQuimico.DETERGENTE, 6.0, 3.0),
    ("Jabón líquido bactericida para manos", TipoQuimico.DETERGENTE, 21.0, 8.0),
    ("Limpiador de pisos", TipoQuimico.DETERGENTE, 30.0, 10.0),
    ("Sanitizante sin enjuague grado alimentario", TipoQuimico.DESINFECTANTE, 3.5, 5.0),
]

ELEMENTOS = [
    ("Escobillón de cerdas duras", 90, -70),
    ("Secador de piso", 120, -100),
    ("Mopa de microfibra", 60, -64),
    ("Balde doble con escurridor", 365, -200),
    ("Cepillo para amasadoras", 90, -85),
    ("Espátula raspadora de bateas", 180, -40),
    ("Paños azules de microfibra (superficies)", 30, -26),
    ("Paños rojos (sanitarios)", 30, -31),
    ("Esponjas no abrasivas", 15, -10),
    ("Cepillo para bandejas", 60, -55),
    ("Rasqueta para hornos", 180, -150),
    ("Pulverizador rotulado", 120, -60),
    ("Cepillo para desagües", 90, -95),
]

TAREAS = {
    "amasadoras": ("Limpieza de amasadoras al finalizar el turno", FrecuenciaTarea.DIARIA, "amasadora_1",
        "Desenchufar el equipo, retirar restos de masa con la espátula, lavar batea y gancho con detergente neutro, enjuagar y aplicar sanitizante. Dejar secar con la tapa abierta.",
        [("Detergente neutro", 0.1), ("Sanitizante de amonio cuaternario", 0.05)], ["Cepillo para amasadoras", "Espátula raspadora de bateas"]),
    "mesas": ("Limpieza y sanitización de mesas de trabajo", FrecuenciaTarea.DIARIA, None,
        "Retirar harina y restos de masa, lavar con detergente neutro, enjuagar y aplicar sanitizante sin enjuague.",
        [("Sanitizante sin enjuague grado alimentario", 0.05)], ["Paños azules de microfibra (superficies)"]),
    "pisos_cuadra": ("Barrido y lavado de pisos de la cuadra", FrecuenciaTarea.DIARIA, None,
        "Barrer en seco desde los rincones hacia el centro, lavar con limpiador de pisos y secar. Señalizar piso mojado.",
        [("Limpiador de pisos", 0.3)], ["Escobillón de cerdas duras", "Secador de piso"]),
    "sobadora": ("Limpieza de sobadora y divisora", FrecuenciaTarea.DIARIA, "sobadora",
        "Con el equipo desenergizado, retirar restos de masa de rodillos y cuchillas, limpiar con paño húmedo y detergente neutro.",
        [("Detergente neutro", 0.1)], ["Paños azules de microfibra (superficies)"]),
    "bandejas": ("Lavado de bandejas y moldes", FrecuenciaTarea.DIARIA, "pileta_lavado",
        "Raspar residuos, lavar en la pileta triple con desengrasante, enjuagar, sanitizar y dejar escurrir en estantes.",
        [("Detergente desengrasante alcalino", 0.4)], ["Cepillo para bandejas"]),
    "envasado": ("Limpieza de embolsadora y mesa de envasado", FrecuenciaTarea.DIARIA, "embolsadora",
        "Retirar migas y restos de bolsas, limpiar superficies de contacto con alcohol 70 %.",
        [("Alcohol 70 %", 0.05)], ["Paños azules de microfibra (superficies)"]),
    "rebanadora": ("Limpieza de la rebanadora", FrecuenciaTarea.DIARIA, "rebanadora",
        "Con guantes anticorte y el equipo desenergizado, retirar migas de las cuchillas con cepillo y limpiar con alcohol 70 %.",
        [("Alcohol 70 %", 0.05)], ["Cepillo para bandejas"]),
    "sanitarios": ("Limpieza y desinfección de sanitarios y vestuarios", FrecuenciaTarea.DIARIA, None,
        "Lavar inodoros, lavamanos y pisos con detergente, desinfectar con hipoclorito diluido y reponer jabón y papel.",
        [("Hipoclorito de sodio 55 g/L", 0.2), ("Jabón líquido bactericida para manos", 0.3)], ["Paños rojos (sanitarios)", "Mopa de microfibra"]),
    "residuos": ("Retiro de residuos y lavado de contenedores", FrecuenciaTarea.DIARIA, None,
        "Retirar las bolsas al depósito de residuos, lavar los contenedores con hipoclorito y colocar bolsas nuevas.",
        [("Hipoclorito de sodio 55 g/L", 0.1)], ["Balde doble con escurridor"]),
    "laminadora": ("Limpieza de laminadora y mesa de facturas", FrecuenciaTarea.DIARIA, "laminadora",
        "Retirar restos de masa y margarina de los rodillos y la lona, limpiar con detergente neutro y secar.",
        [("Detergente neutro", 0.1)], ["Espátula raspadora de bateas", "Paños azules de microfibra (superficies)"]),
    "hornos": ("Limpieza profunda de hornos rotativos", FrecuenciaTarea.SEMANAL, "horno_rotativo_1",
        "Con el horno frío, raspar la cámara, aplicar limpiador de hornos, dejar actuar 20 minutos y enjuagar. Revisar burletes.",
        [("Limpiador de hornos", 0.5)], ["Rasqueta para hornos"]),
    "camara_frio": ("Limpieza y desinfección de la cámara frigorífica", FrecuenciaTarea.SEMANAL, "camara_frio",
        "Retirar la mercadería a la cámara de respaldo, lavar estantes y paredes, desinfectar y reubicar respetando el orden PEPS.",
        [("Detergente neutro", 0.3), ("Sanitizante de amonio cuaternario", 0.2)], ["Paños azules de microfibra (superficies)"]),
    "camara_leudado": ("Limpieza de la cámara de leudado", FrecuenciaTarea.SEMANAL, "camara_leudado",
        "Limpiar paredes, piso y bandejas de condensado; desinfectar y verificar el drenaje del humidificador.",
        [("Sanitizante de amonio cuaternario", 0.2)], ["Mopa de microfibra"]),
    "estanterias": ("Limpieza de estanterías del depósito de secos", FrecuenciaTarea.SEMANAL, None,
        "Retirar bolsas, limpiar estantes y tarimas, revisar presencia de plagas y reubicar respetando el orden PEPS.",
        [("Alcohol 70 %", 0.1)], ["Paños azules de microfibra (superficies)"]),
    "desagues": ("Limpieza de desagües y rejillas", FrecuenciaTarea.SEMANAL, None,
        "Levantar rejillas, retirar sólidos, aplicar desincrustante y cepillar. Enjuagar con abundante agua.",
        [("Desincrustante ácido", 0.3)], ["Cepillo para desagües"]),
    "freezer": ("Descongelado y limpieza del freezer de masas", FrecuenciaTarea.MENSUAL, "freezer_masas",
        "Pasar la mercadería al freezer de respaldo, descongelar, lavar, desinfectar y verificar que alcance −18 °C antes de reponer.",
        [("Detergente neutro", 0.3), ("Sanitizante de amonio cuaternario", 0.2)], ["Paños azules de microfibra (superficies)"]),
    "campanas": ("Limpieza de campanas y extractores de hornos", FrecuenciaTarea.MENSUAL, "horno_rotativo_2",
        "Retirar filtros, sumergirlos en desengrasante, limpiar la campana y verificar el funcionamiento del extractor.",
        [("Detergente desengrasante alcalino", 1.0)], ["Pulverizador rotulado"]),
    "luminarias": ("Limpieza de luminarias y paredes de la cuadra", FrecuenciaTarea.MENSUAL, None,
        "Con escalera y elementos de protección, limpiar luminarias y paredes hasta 2 m con detergente neutro.",
        [("Detergente neutro", 0.5)], ["Mopa de microfibra"]),
    "divisora": ("Desarme y limpieza profunda de la divisora", FrecuenciaTarea.MENSUAL, "divisora",
        "Desarmar cabezal y cuchillas según el manual, limpiar con desengrasante, lubricar con grasa grado alimentario y rearmar.",
        [("Detergente desengrasante alcalino", 0.3)], ["Cepillo para amasadoras"]),
    "plagas": ("Revisión de cebaderas y trampas de plagas", FrecuenciaTarea.DIARIA, None,
        "Recorrer las cebaderas numeradas del plano, registrar consumo de cebo y novedades.",
        [], []),
    "zocalos": ("Limpieza de zócalos, rincones y detrás de equipos", FrecuenciaTarea.DIARIA, None,
        "Mover los equipos móviles, barrer y lavar zócalos y rincones con limpiador de pisos.",
        [("Limpiador de pisos", 0.2)], ["Escobillón de cerdas duras"]),
    "horno_piso": ("Limpieza del horno de piso", FrecuenciaTarea.DIARIA, "horno_piso",
        "Barrer la solera y limpiar puertas y vidrios.",
        [], ["Rasqueta para hornos"]),
}

PLANES = [
    ("POES - Cuadra de amasado", "Limpieza diaria de equipos y pisos del sector de amasado.", "AMA", "amasadora_1",
        "sebastian.luna", ["amasadoras", "pisos_cuadra", "sobadora", "desagues"], -120, None, True),
    ("POES - Sector de hornos", "Lavado de bandejas y limpieza profunda programada de hornos.", "HOR", "horno_rotativo_1",
        "jorge.medina", ["bandejas", "hornos", "campanas"], -120, None, True),
    ("POES - Facturas y hojaldre", "Limpieza de la línea de facturas y de las mesas de trabajo.", "FAC", "laminadora",
        "patricia.ibarra", ["laminadora", "mesas"], -120, None, True),
    ("POES - Envasado y rotulado", "Limpieza de la línea de envasado.", "ENV", "embolsadora",
        "romina.vera", ["envasado"], -120, None, True),
    ("POES - Rebanadora nueva", "Plan incorporado con la llegada de la nueva rebanadora de pan de molde.", "ENF", "rebanadora",
        "romina.vera", ["rebanadora"], -12, None, True),
    ("POES - Cámaras de frío y fermentación", "Limpieza programada de cámaras y freezer.", "FRI", "camara_frio",
        "claudia.sosa", ["camara_frio", "camara_leudado", "freezer"], -120, None, True),
    ("POES - Depósito y recepción", "Orden y limpieza del depósito de materias primas.", "SEC", None,
        "lucas.molina", ["estanterias"], -120, None, True),
    ("POES - Sanitarios, vestuarios y residuos", "Higiene de sanitarios, vestuarios y gestión diaria de residuos.", "VES", None,
        "lucas.molina", ["sanitarios", "residuos"], -120, None, True),
    ("POES - Instalaciones generales", "Limpiezas mensuales de instalaciones y desarme de equipos.", "AMA", None,
        "opera", ["luminarias", "divisora"], -120, None, True),
    ("Limpieza intensiva previa a la auditoría bromatológica", "Refuerzo temporal de limpieza y control de plagas antes de la inspección municipal.", "SEC", None,
        "admin", ["plagas", "zocalos"], -24, -10, True),
    ("POES - Horno de piso (fuera de servicio)", "Plan suspendido mientras el horno de piso está fuera de servicio.", "HOR", "horno_piso",
        "jorge.medina", ["horno_piso"], -120, None, False),
]

TIPOS_DOCUMENTO = [
    "Libreta sanitaria",
    "Carnet de manipulador de alimentos",
    "Curso de Buenas Prácticas de Manufactura",
    "Apto médico laboral",
    "Capacitación en alérgenos y TACC",
    "Capacitación en uso seguro de productos químicos",
]

DOCUMENTACION = {
    "admin": [("Libreta sanitaria", 210), ("Carnet de manipulador de alimentos", 400), ("Curso de Buenas Prácticas de Manufactura", 300), ("Capacitación en alérgenos y TACC", 160)],
    "admin.solo": [("Apto médico laboral", 90)],
    "opera": [("Libreta sanitaria", 45), ("Carnet de manipulador de alimentos", 12), ("Apto médico laboral", 200), ("Curso de Buenas Prácticas de Manufactura", 130)],
    "sebastian.luna": [("Libreta sanitaria", 180), ("Carnet de manipulador de alimentos", 320), ("Apto médico laboral", 260)],
    "jorge.medina": [("Libreta sanitaria", 3), ("Carnet de manipulador de alimentos", 240), ("Apto médico laboral", 150), ("Capacitación en uso seguro de productos químicos", 70)],
    "claudia.sosa": [("Libreta sanitaria", -12), ("Carnet de manipulador de alimentos", 95), ("Apto médico laboral", 300), ("Capacitación en uso seguro de productos químicos", 220)],
    "romina.vera": [("Libreta sanitaria", 260), ("Carnet de manipulador de alimentos", 30), ("Apto médico laboral", 0), ("Capacitación en alérgenos y TACC", 200)],
    "patricia.ibarra": [("Libreta sanitaria", 120), ("Carnet de manipulador de alimentos", 210), ("Apto médico laboral", 75), ("Capacitación en alérgenos y TACC", -40)],
    "lucas.molina": [("Libreta sanitaria", 330), ("Carnet de manipulador de alimentos", 7), ("Apto médico laboral", 180), ("Capacitación en uso seguro de productos químicos", 25)],
}

INCIDENTES = [
    ("Panadería Los Andes reclamó tres paquetes de pan de molde blanco con moho dos días antes del vencimiento.",
        "Producto / cliente", 12, 9, "admin.solo", 0,
        "Se retiraron los paquetes del cliente, se reforzó la limpieza de la rebanadora y se verificó la dosis de propionato.", False),
    ("Se encontraron excrementos de roedor detrás de las estanterías del depósito de secos.",
        "Plagas", 20, 7, "lucas.molina", 1,
        "Intervino la empresa de control de plagas, se sellaron aberturas bajo la puerta y se agregaron dos cebaderas.", False),
    ("El horno rotativo N.º 2 no alcanza los 200 °C y los panes salen pálidos.",
        "Equipos e instalaciones", 3, 5, "jorge.medina", None, None, False),
    ("Un operario se cortó el dedo índice limpiando la cuchilla de la rebanadora sin guante anticorte.",
        "Accidente", 7, 14, "romina.vera", None,
        "Se realizó la curación, se compraron guantes anticorte y se repasó el instructivo de limpieza con el personal.", False),
    ("La cámara frigorífica registró 9 °C a las 7:00 porque la puerta quedó mal cerrada durante la noche.",
        "Equipos e instalaciones", 5, 7, "claudia.sosa", 0,
        "Se descartaron 6 kg de huevo líquido, se ajustó el cierre de la puerta y se agregó el control al cierre del turno.", False),
    ("Se detectaron polillas en dos bolsas de harina integral del depósito.",
        "Plagas", 2, 8, "lucas.molina", None, None, False),
    ("Las etiquetas de prepizza salieron impresas con un vencimiento 30 días posterior al correcto.",
        "Producto / cliente", 9, 11, "romina.vera", 2,
        "Se reetiquetaron los paquetes y se corrigió la plantilla de la impresora.", True),
    ("Faltó jabón en el lavamanos del ingreso a la cuadra durante el turno noche.",
        "Higiene y limpieza", 1, 4, "sebastian.luna", None, None, False),
    ("Quemadura leve en el antebrazo al retirar un carro del horno sin manopla.",
        "Accidente", 15, 6, "jorge.medina", None,
        "Se aplicaron primeros auxilios y se colocaron manoplas nuevas junto a cada horno.", False),
    ("Restos de masa seca en la amasadora N.º 2 al inicio del turno.",
        "Higiene y limpieza", 4, 4, "opera", 2,
        "Se repitió la limpieza y se capacitó al turno tarde sobre el procedimiento.", False),
    ("Panadería La Estrella informó un trozo de plástico en una medialuna.",
        "Producto / cliente", 6, 10, "admin.solo", None, None, False),
    ("Corte de luz de 40 minutos durante el enfriado del pan de miga.",
        "Otros", 6, 13, "opera", None,
        "Se registró la temperatura del producto en planilla, se completó el enfriado y se liberó el lote.", False),
    ("Bolsa de azúcar rota en la recepción; se descartaron 5 kg.",
        "Otros", 18, 8, "lucas.molina", None,
        "Se limpió el área y se pidió al proveedor que refuerce el estibado.", False),
]

INCIDENTES_PROVEEDOR = [
    ("El proveedor de huevo entregó sin el registro de temperatura del transporte.", 25, 7, "lucas.molina",
        "Se rechazó la entrega y se solicitó al proveedor el registro de cadena de frío."),
    ("Llegaron dos bolsas de harina con el envase húmedo.", 10, 8, "lucas.molina", None),
]

DOCUMENTOS_TECNICOS = [
    ("Manual de Buenas Prácticas de Manufactura", "manual_bpm", "Manual general de BPM de la planta.", "AMA", 2),
    ("POES - Limpieza y desinfección de la cuadra de amasado", "procedimiento", "Procedimiento operativo estandarizado de saneamiento.", "AMA", 1),
    ("POES - Limpieza de hornos rotativos", "procedimiento", "Limpieza diaria y profunda de hornos.", "HOR", 1),
    ("Procedimiento de recepción de materias primas", "procedimiento", "Controles de recepción, temperatura y rotulado.", "REC", 1),
    ("Procedimiento de control de temperaturas de cámaras", "procedimiento", "Registro y acciones ante desvíos.", "FRI", 1),
    ("Plan de control integrado de plagas", "procedimiento", "Plano de cebaderas, frecuencias y responsables.", "SEC", 1),
    ("Procedimiento de retiro de producto del mercado", "procedimiento", "Pasos para el recall y la comunicación con clientes.", "EXP", 1),
    ("Procedimiento de gestión de alérgenos", "procedimiento", "Separación, limpieza y rotulado de alérgenos.", "FAC", 1),
    ("Ficha técnica - Pan de molde blanco", "ficha_tecnica", "Especificación de producto terminado.", "ENV", 1),
    ("Ficha técnica - Prepizza", "ficha_tecnica", "Especificación de producto terminado.", "ENV", 1),
    ("Hoja de seguridad - Hipoclorito de sodio 55 g/L", "ficha_tecnica", "Hoja de seguridad del proveedor.", "LIM", 1),
    ("Receta estándar - Pan francés", "receta", "Formulación y proceso de referencia.", "AMA", 1),
]

PRODUCTOS = [
    ("Pan francés", "Pan tipo flauta y mignon, venta a granel en bolsas de 5 kg a panaderías y comercios.", "kg", True),
    ("Pan de molde blanco", "Pan de molde lacteado de 550 g en bolsa impresa.", "un", True),
    ("Pan de molde integral", "Pan de molde integral con salvado de 550 g en bolsa impresa.", "un", True),
    ("Pan de miga", "Paquete de 6 planchas de pan de miga para sandwicherías.", "paquete", True),
    ("Prepizza", "Prepizza de 30 cm con salsa, paquete de 2 unidades.", "paquete", True),
    ("Pan de hamburguesa con sésamo", "Paquete de 4 panes para hamburguesa.", "paquete", True),
    ("Pan de pancho", "Paquete de 6 panes para pancho.", "paquete", True),
    ("Medialunas de manteca", "Caja de 12 medialunas para cafeterías.", "caja", True),
    ("Facturas surtidas", "Caja de 12 facturas: vigilantes, bolas de fraile y cañoncitos.", "caja", True),
    ("Bizcochos de grasa", "Venta a granel en bolsas de 2 kg.", "kg", True),
    ("Pan rallado", "Paquete de 1 kg.", "paquete", True),
    ("Grisines", "Paquete de 250 g.", "paquete", True),
    ("Tapas de empanada para horno", "Paquete de 12 tapas.", "paquete", True),
    ("Pan de salvado", "Producto discontinuado por baja demanda.", "kg", False),
]

PASOS_PAN = [
    ("Pesado de ingredientes", "Pesar harina, agua, levadura, sal y aditivos según la orden de producción; verificar la balanza con la pesa patrón.", "balanza_amasado", 10, None, False),
    ("Amasado", "Amasar 4 minutos en primera velocidad y 8 en segunda hasta desarrollar el gluten. Medir la temperatura final de la masa (24 a 26 °C).", "amasadora_1", 12, 26, True),
    ("División y boleado", "Dividir en piezas del peso indicado en la orden y bolear.", "divisora", 15, None, False),
    ("Formado", "Formar las piezas y colocarlas en bandejas o moldes engrasados.", "sobadora", 20, None, False),
    ("Fermentación", "Leudar en cámara a 32 °C y 80 % de humedad hasta duplicar el volumen.", "camara_leudado", 75, 32, True),
    ("Horneado", "Hornear con vapor inicial hasta dorar. Verificar temperatura interna mínima de 92 °C con el termómetro de pinche.", "horno_rotativo_1", 25, 200, True),
    ("Enfriado", "Enfriar en carros a temperatura ambiente antes de envasar (mínimo 60 minutos).", "carros", 60, None, False),
]

PASO_REBANADO = ("Rebanado y envasado", "Rebanar, embolsar y cerrar con clip. Verificar peso neto y fecha de vencimiento en la etiqueta.", "embolsadora", 30, None, True)
PASO_ENVASADO = ("Envasado y rotulado", "Embolsar, cerrar y etiquetar. Verificar peso neto, lote y vencimiento.", "embolsadora", 25, None, True)

PASOS_FACTURAS = [
    ("Pesado de ingredientes", "Pesar los ingredientes de la masa y del empaste según la orden.", "balanza_amasado", 10, None, False),
    ("Amasado", "Amasar hasta obtener una masa lisa; reposar 20 minutos en frío.", "amasadora_2", 15, 24, True),
    ("Laminado y empaste", "Incorporar el empaste y dar tres vueltas simples en la laminadora, con reposo en frío entre vueltas.", "laminadora", 45, None, False),
    ("Formado y relleno", "Cortar, formar y rellenar según el tipo de pieza.", None, 40, None, False),
    ("Fermentación", "Leudar a 28 °C para no derretir el empaste.", "camara_leudado", 90, 28, True),
    ("Horneado", "Hornear hasta dorar y pintar con almíbar al salir del horno.", "horno_rotativo_2", 18, 190, True),
    ("Enfriado y encajado", "Enfriar en carros y encajar de a 12 unidades. Verificar etiqueta.", "carros", 40, None, True),
]

PASOS_LAMINADOS = [
    ("Pesado de ingredientes", "Pesar los ingredientes según la orden de producción.", "balanza_amasado", 10, None, False),
    ("Amasado", "Amasar hasta obtener una masa firme y homogénea.", "amasadora_2", 12, None, False),
    ("Laminado", "Laminar al espesor indicado en la orden.", "laminadora", 25, None, False),
    ("Cortado", "Cortar las piezas con el molde o la cortadora.", None, 30, None, False),
]

PASOS_PREPIZZA = [
    ("Pesado de ingredientes", "Pesar harina, agua, levadura, sal y aceite según la orden.", "balanza_amasado", 10, None, False),
    ("Amasado", "Amasar hasta obtener una masa lisa. Medir la temperatura final (24 a 26 °C).", "amasadora_1", 12, 26, True),
    ("División y estirado", "Dividir en bollos de 400 g y estirar en la laminadora a 30 cm.", "laminadora", 25, None, False),
    ("Fermentación corta", "Leudar 30 minutos en cámara.", "camara_leudado", 30, 30, False),
    ("Salsado y precocción", "Cubrir con puré de tomate y precocinar. Verificar temperatura interna mínima de 90 °C.", "horno_rotativo_2", 10, 230, True),
    ("Enfriado", "Enfriar en carros hasta temperatura ambiente.", "carros", 45, None, False),
    ("Envasado y refrigeración", "Embolsar de a dos, etiquetar y llevar a cámara a menos de 8 °C.", "embolsadora", 20, None, True),
]

PASOS_PAN_RALLADO = [
    ("Pesado de ingredientes", "Pesar los ingredientes del pan base.", "balanza_amasado", 10, None, False),
    ("Amasado", "Amasar hasta obtener una masa firme.", "amasadora_1", 12, None, False),
    ("Horneado del pan base", "Hornear el pan base hasta cocción completa.", "horno_rotativo_1", 35, 210, False),
    ("Secado", "Secar en horno apagado durante 3 horas hasta humedad menor al 8 %.", "horno_rotativo_1", 180, 80, True),
    ("Molienda y tamizado", "Moler y tamizar con malla de 2 mm.", "moledora", 40, None, False),
    ("Envasado y rotulado", "Embolsar de a 1 kg, cerrar y etiquetar.", "balanza_envasado", 30, None, True),
]


def _pan(rebanado=False, envasado=True):
    pasos = list(PASOS_PAN)
    if rebanado:
        pasos.append(PASO_REBANADO)
    elif envasado:
        pasos.append(PASO_ENVASADO)
    return pasos


def _horneado_seco(nombre_horneado):
    return PASOS_LAMINADOS + [
        (nombre_horneado, "Hornear hasta dorar parejo y que estén secos al tacto.", "horno_rotativo_2", 25, 180, True),
        ("Enfriado", "Enfriar en carros antes de envasar.", "carros", 40, None, False),
        PASO_ENVASADO,
    ]


RECETAS = {
    "Pan francés": (75, "kg", 50, "1 pan mignon",
        [("Harina de trigo 000", 50, "kg"), ("Agua", 30, "L"), ("Levadura fresca", 1.0, "kg"), ("Sal fina", 1.0, "kg"), ("Extracto de malta", 0.25, "kg")],
        [("Mejorador panificador (ácido ascórbico)", 100, "g")],
        _pan(envasado=False) + [("Embolsado a granel", "Embolsar en bolsas de papel de 5 kg identificadas con el lote.", "balanza_envasado", 20, None, False)]),
    "Pan de molde blanco": (70, "un", 50, "2 rebanadas",
        [("Harina de trigo 000", 25, "kg"), ("Agua", 13, "L"), ("Levadura fresca", 0.75, "kg"), ("Sal fina", 0.5, "kg"), ("Azúcar", 1.25, "kg"), ("Grasa vacuna refinada", 0.75, "kg"), ("Leche en polvo entera", 0.75, "kg")],
        [("Propionato de calcio en polvo", 75, "g"), ("Mejorador panificador (ácido ascórbico)", 50, "g")],
        _pan(rebanado=True)),
    "Pan de molde integral": (70, "un", 50, "2 rebanadas",
        [("Harina de trigo integral", 10, "kg"), ("Harina de trigo 000", 12, "kg"), ("Salvado de trigo", 3, "kg"), ("Agua", 15, "L"), ("Levadura fresca", 0.8, "kg"), ("Sal fina", 0.45, "kg"), ("Azúcar", 1.0, "kg"), ("Aceite de girasol", 0.6, "L")],
        [("Propionato de calcio en polvo", 70, "g")],
        _pan(rebanado=True)),
    "Pan de miga": (10, "paquete", 50, "2 rebanadas",
        [("Harina de trigo 0000", 25, "kg"), ("Agua", 12, "L"), ("Levadura fresca", 0.5, "kg"), ("Sal fina", 0.5, "kg"), ("Grasa vacuna refinada", 1.5, "kg"), ("Leche en polvo entera", 0.5, "kg"), ("Azúcar", 0.25, "kg")],
        [("Propionato de calcio en polvo", 60, "g")],
        _pan(rebanado=True)),
    "Prepizza": (45, "paquete", 100, "1/4 de prepizza",
        [("Harina de trigo 000", 20, "kg"), ("Agua", 11, "L"), ("Levadura fresca", 0.4, "kg"), ("Sal fina", 0.4, "kg"), ("Aceite de girasol", 0.8, "L"), ("Puré de tomate", 6, "kg")],
        [("Sorbato de potasio en polvo", 20, "g")],
        PASOS_PREPIZZA),
    "Pan de hamburguesa con sésamo": (75, "paquete", 80, "1 pan",
        [("Harina de trigo 0000", 15, "kg"), ("Agua", 7.5, "L"), ("Levadura fresca", 0.45, "kg"), ("Sal fina", 0.27, "kg"), ("Azúcar", 0.9, "kg"), ("Manteca", 0.75, "kg"), ("Leche en polvo entera", 0.45, "kg"), ("Huevo líquido pasteurizado", 0.6, "kg"), ("Semillas de sésamo", 0.3, "kg")],
        [("Propionato de calcio en polvo", 45, "g"), ("Lecitina de soja líquida", 30, "g")],
        _pan()),
    "Pan de pancho": (70, "paquete", 55, "1 pan",
        [("Harina de trigo 0000", 15, "kg"), ("Agua", 8, "L"), ("Levadura fresca", 0.45, "kg"), ("Sal fina", 0.27, "kg"), ("Azúcar", 0.75, "kg"), ("Grasa vacuna refinada", 0.6, "kg"), ("Leche en polvo entera", 0.3, "kg")],
        [("Propionato de calcio en polvo", 45, "g")],
        _pan()),
    "Medialunas de manteca": (40, "caja", 45, "1 medialuna",
        [("Harina de trigo 0000", 10, "kg"), ("Agua", 4.5, "L"), ("Leche en polvo entera", 0.5, "kg"), ("Azúcar", 1.5, "kg"), ("Huevo líquido pasteurizado", 1.0, "kg"), ("Levadura fresca", 0.5, "kg"), ("Sal fina", 0.15, "kg"), ("Manteca", 5.0, "kg")],
        [("Esencia de vainilla", 30, "ml")],
        PASOS_FACTURAS),
    "Facturas surtidas": (40, "caja", 50, "1 factura",
        [("Harina de trigo 0000", 10, "kg"), ("Agua", 4.5, "L"), ("Leche en polvo entera", 0.5, "kg"), ("Azúcar", 1.2, "kg"), ("Huevo líquido pasteurizado", 0.8, "kg"), ("Levadura fresca", 0.5, "kg"), ("Sal fina", 0.15, "kg"), ("Margarina para hojaldre", 4.0, "kg"), ("Dulce de membrillo", 2.0, "kg"), ("Dulce de leche repostero", 2.0, "kg")],
        [("Esencia de vainilla", 30, "ml")],
        PASOS_FACTURAS),
    "Bizcochos de grasa": (28, "kg", 30, "6 bizcochos",
        [("Harina de trigo 000", 20, "kg"), ("Agua", 9, "L"), ("Grasa vacuna refinada", 4, "kg"), ("Sal fina", 0.4, "kg"), ("Levadura fresca", 0.3, "kg")],
        [],
        _horneado_seco("Horneado")[:-1] + [("Embolsado a granel", "Embolsar en bolsas de 2 kg identificadas con el lote.", "balanza_envasado", 20, None, False)]),
    "Pan rallado": (22, "paquete", 30, "3 cucharadas",
        [("Harina de trigo 000", 20, "kg"), ("Agua", 11, "L"), ("Levadura fresca", 0.3, "kg"), ("Sal fina", 0.35, "kg")],
        [],
        PASOS_PAN_RALLADO),
    "Grisines": (54, "paquete", 30, "6 grisines",
        [("Harina de trigo 000", 10, "kg"), ("Agua", 4.5, "L"), ("Aceite de girasol", 1.2, "L"), ("Sal fina", 0.2, "kg"), ("Levadura fresca", 0.2, "kg"), ("Extracto de malta", 0.1, "kg")],
        [],
        _horneado_seco("Horneado")),
    "Tapas de empanada para horno": (60, "paquete", 33, "1 tapa",
        [("Harina de trigo 000", 15, "kg"), ("Agua", 6.5, "L"), ("Grasa vacuna refinada", 2.2, "kg"), ("Sal fina", 0.3, "kg")],
        [("Sorbato de potasio en polvo", 15, "g")],
        PASOS_LAMINADOS + [("Envasado y refrigeración", "Apilar 12 tapas con separadores, embolsar, etiquetar y refrigerar a menos de 8 °C.", "embolsadora", 30, None, True)]),
}

VERSIONES_NUEVAS = {
    "Pan de molde blanco": (12, "Reducción de sal para cumplir la meta de sodio", {"Sal fina": 0.42}),
    "Prepizza": (20, "Más puré de tomate por pedido de los clientes", {"Puré de tomate": 7.0}),
    "Medialunas de manteca": (5, "Cambio de proveedor de manteca: ajuste del empaste", {"Manteca": 4.8}),
}

RESPONSABLE_PRODUCTO = {
    "Pan francés": ("opera", 4),
    "Pan de molde blanco": ("sebastian.luna", 5),
    "Pan de molde integral": ("sebastian.luna", 6),
    "Pan de miga": ("opera", 5),
    "Prepizza": ("sebastian.luna", 7),
    "Pan de hamburguesa con sésamo": ("opera", 8),
    "Pan de pancho": ("opera", 8),
    "Medialunas de manteca": ("patricia.ibarra", 3),
    "Facturas surtidas": ("patricia.ibarra", 4),
    "Bizcochos de grasa": ("claudia.sosa", 9),
    "Pan rallado": ("claudia.sosa", 10),
    "Grisines": ("claudia.sosa", 9),
    "Tapas de empanada para horno": ("claudia.sosa", 7),
}

PLAN_PRODUCCION = {
    "Pan francés": ({0, 1, 2, 3, 4, 5, 6}, 2.0),
    "Medialunas de manteca": ({0, 1, 2, 3, 4, 5, 6}, 1.0),
    "Facturas surtidas": ({0, 2, 4, 5, 6}, 1.0),
    "Pan de molde blanco": ({0, 1, 2, 3, 4, 5}, 1.0),
    "Pan de miga": ({0, 1, 2, 3, 4, 5}, 1.0),
    "Pan de molde integral": ({0, 2, 4}, 0.5),
    "Prepizza": ({1, 3, 5}, 1.0),
    "Tapas de empanada para horno": ({1, 3}, 1.0),
    "Pan de hamburguesa con sésamo": ({2, 4}, 1.0),
    "Pan de pancho": ({3, 5}, 1.0),
    "Bizcochos de grasa": ({1, 4}, 1.0),
    "Grisines": ({2}, 1.0),
    "Pan rallado": ({0}, 1.0),
}

LOTE_ANULADO = ("Pan de hamburguesa con sésamo", 9,
    "Se encontró un fragmento de plástico de una bolsa de materia prima en la masa; se descartó el lote completo.")
LOTE_CERRADO_CON_PENDIENTES = ("Pan de miga", 6,
    "Corte de luz durante el enfriado: el último paso se registró en planilla papel.")

MARCAS_AGREGADOS = {
    "Azúcar": {"es_azucar_anadido": True},
    "Extracto de malta": {"es_azucar_anadido": True},
    "Dulce de membrillo": {"es_azucar_anadido": True},
    "Dulce de leche repostero": {"es_azucar_anadido": True, "es_grasa_anadida": True},
    "Grasa vacuna refinada": {"es_grasa_anadida": True},
    "Margarina para hojaldre": {"es_grasa_anadida": True},
    "Manteca": {"es_grasa_anadida": True},
    "Aceite de girasol": {"es_grasa_anadida": True},
    "Sal fina": {"aporta_sodio_anadido": True},
    "Polvo de hornear (bicarbonato)": {"aporta_sodio_anadido": True},
}

VENTA_A_GRANEL = {"Pan francés", "Bizcochos de grasa"}

CORRECCIONES_ROTULADO = {
    "Grisines": [(Hecho.AGREGA_AZUCARES, False, "El extracto de malta se usa solo para dar color; el aporte de azúcar es despreciable.")],
}

ALERGENOS = {
    "Harina de trigo 000": (["Trigo"], True),
    "Harina de trigo 0000": (["Trigo"], True),
    "Harina de trigo integral": (["Trigo"], True),
    "Salvado de trigo": (["Trigo"], True),
    "Extracto de malta": (["Cebada"], True),
    "Leche en polvo entera": (["Leche"], False),
    "Manteca": (["Leche"], False),
    "Dulce de leche repostero": (["Leche"], False),
    "Huevo líquido pasteurizado": (["Huevo"], False),
    "Lecitina de soja líquida": (["Soja"], False),
}

FUENTE_REFERENCIA = "Tabla de composición (valores de prueba)"

REFERENCIAS_NUTRICIONALES = {
    "Harina de trigo 000": "DEMO-001",
    "Harina de trigo 0000": "DEMO-001",
    "Harina de trigo integral": "DEMO-002",
    "Azúcar": "DEMO-004",
    "Agua": "DEMO-006",
    "Levadura fresca": "DEMO-007",
    "Aceite de girasol": "DEMO-008",
    "Manteca": "DEMO-009",
    "Sal fina": "DEMO-010",
    "Puré de tomate": "DEMO-011",
    "Huevo líquido pasteurizado": "DEMO-017",
}

REFERENCIAS_ADITIVOS = {"Polvo de hornear (bicarbonato)": "DEMO-019"}

N = Nutriente
ROTULOS_PROVEEDOR = {
    "Grasa vacuna refinada": {N.ENERGIA: 900, N.CARBOHIDRATOS: 0, N.AZUCARES_TOTALES: 0, N.AZUCARES_ANADIDOS: 0, N.PROTEINAS: 0, N.GRASAS_TOTALES: 100, N.GRASAS_SATURADAS: 50, N.GRASAS_TRANS: 1.5, N.FIBRA: 0, N.SODIO: 0},
    "Margarina para hojaldre": {N.ENERGIA: 720, N.CARBOHIDRATOS: 0, N.AZUCARES_TOTALES: 0, N.AZUCARES_ANADIDOS: 0, N.PROTEINAS: 0, N.GRASAS_TOTALES: 80, N.GRASAS_SATURADAS: 35, N.GRASAS_TRANS: 0.5, N.FIBRA: 0, N.SODIO: 400},
    "Leche en polvo entera": {N.ENERGIA: 496, N.CARBOHIDRATOS: 38, N.AZUCARES_TOTALES: 38, N.AZUCARES_ANADIDOS: 0, N.PROTEINAS: 26, N.GRASAS_TOTALES: 26, N.GRASAS_SATURADAS: 16.7, N.GRASAS_TRANS: 0.8, N.FIBRA: 0, N.SODIO: 370},
    "Extracto de malta": {N.ENERGIA: 320, N.CARBOHIDRATOS: 79, N.AZUCARES_TOTALES: 55, N.AZUCARES_ANADIDOS: 55, N.PROTEINAS: 6, N.GRASAS_TOTALES: 0, N.GRASAS_SATURADAS: 0, N.GRASAS_TRANS: 0, N.FIBRA: 0, N.SODIO: 40},
    "Salvado de trigo": {N.ENERGIA: 216, N.CARBOHIDRATOS: 18, N.AZUCARES_TOTALES: 0.4, N.AZUCARES_ANADIDOS: 0, N.PROTEINAS: 15.6, N.GRASAS_TOTALES: 4.3, N.GRASAS_SATURADAS: 0.6, N.GRASAS_TRANS: 0, N.FIBRA: 42.8, N.SODIO: 2},
    "Semillas de sésamo": {N.ENERGIA: 573, N.CARBOHIDRATOS: 12, N.AZUCARES_TOTALES: 0.3, N.AZUCARES_ANADIDOS: 0, N.PROTEINAS: 17.7, N.GRASAS_TOTALES: 49.7, N.GRASAS_SATURADAS: 7, N.GRASAS_TRANS: 0, N.FIBRA: 11.8, N.SODIO: 11},
    "Dulce de membrillo": {N.ENERGIA: 270, N.CARBOHIDRATOS: 67, N.AZUCARES_TOTALES: 52, N.AZUCARES_ANADIDOS: 45, N.PROTEINAS: 0.3, N.GRASAS_TOTALES: 0, N.GRASAS_SATURADAS: 0, N.GRASAS_TRANS: 0, N.FIBRA: 1.5, N.SODIO: 5},
    "Dulce de leche repostero": {N.ENERGIA: 315, N.CARBOHIDRATOS: 55, N.AZUCARES_TOTALES: 50, N.AZUCARES_ANADIDOS: 40, N.PROTEINAS: 7, N.GRASAS_TOTALES: 7, N.GRASAS_SATURADAS: 4.3, N.GRASAS_TRANS: 0.2, N.FIBRA: 0, N.SODIO: 140},
}

ROTULOS = {
    "Pan de molde blanco": (550, "g", 7, "ambiente", None),
    "Pan de molde integral": (550, "g", 7, "ambiente", None),
    "Pan de miga": (3600, "g", 5, "ambiente", None),
    "Prepizza": (800, "g", 10, "refrigerado", (2, 8, "Una vez abierto, consumir dentro de las 48 h")),
    "Pan de hamburguesa con sésamo": (320, "g", 10, "ambiente", None),
    "Pan de pancho": (330, "g", 10, "ambiente", None),
    "Medialunas de manteca": (540, "g", 2, "ambiente", None),
    "Facturas surtidas": (600, "g", 2, "ambiente", None),
    "Pan rallado": (1, "kg", 120, "ambiente", None),
    "Grisines": (250, "g", 90, "ambiente", None),
    "Tapas de empanada para horno": (396, "g", 30, "refrigerado", (0, 8, "Mantener refrigerado y consumir dentro de los 5 días de abierto")),
}

INSTRUCCIONES = {
    "Prepizza": "Precalentar el horno a 220 °C, agregar la cobertura y hornear 10 a 12 minutos.",
    "Tapas de empanada para horno": "Rellenar, cerrar y hornear a 200 °C durante 20 minutos.",
}

PUEDE_CONTENER = {
    "Facturas surtidas": ["Maní", "Nuez"],
    "Medialunas de manteca": ["Soja"],
    "Pan de molde integral": ["Soja"],
}

ROTULOS_SIN_CONFIRMAR = {"Pan de pancho", "Grisines"}
