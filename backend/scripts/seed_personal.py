"""Personal y perfiles de demostración."""

from scripts.seed_common import PASSWORD_ADMIN, PASSWORD_OPERARIO
from src.auth.utils import get_password_hash
from src.personal.models import Personal


PERSONAS = [
    ("Lucía", "Fernández"), ("María", "Gómez"), ("Carlos", "Pérez"),
    ("Ana", "Rodríguez"), ("Diego", "Martínez"), ("Sofía", "López"),
    ("Javier", "García"), ("Valentina", "Torres"), ("Pablo", "Romero"),
    ("Camila", "Díaz"), ("Martín", "Acosta"), ("Florencia", "Ruiz"),
    ("Nicolás", "Suárez"), ("Julieta", "Castro"), ("Gabriel", "Herrera"),
]


def cargar_personal(crear):
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

    return personas, operadores, admin
