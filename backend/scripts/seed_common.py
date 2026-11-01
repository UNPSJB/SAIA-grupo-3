"""Utilidades compartidas por los seeds; no ejecuta cargas al importarse."""
import shutil
from pathlib import Path

from sqlalchemy import select


CANTIDAD = 15

PASSWORD_ADMIN = "admin123"

PASSWORD_OPERARIO = "opera123"

ASSETS_DIR = Path(__file__).resolve().parents[1] / "seed_assets"

FOTOS = ["cocina-industrial.jpg", "lavado-utensilios.jpg", "mesada-lavado.jpg"]

def obtener_o_crear(db, modelo, filtros, valores):
    """Claves estables: repetir el seed no duplica ni borra registros."""
    registro = db.scalar(select(modelo).filter_by(**filtros))
    creado = registro is None
    if creado:
        registro = modelo(**filtros, **valores)
        db.add(registro)
        db.flush()
    return registro, creado

def foto_contexto(indice, uploads_dir):
    origen = ASSETS_DIR / FOTOS[indice % len(FOTOS)]
    if not origen.is_file() or origen.read_bytes()[:3] != b"\xff\xd8\xff":
        raise FileNotFoundError(f"Falta la fotografía JPEG del seed: {origen}")
    uploads_dir.mkdir(parents=True, exist_ok=True)
    destino = uploads_dir / ("seed-contexto-" + origen.name)
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
