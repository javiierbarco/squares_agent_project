"""
web
===

Paquete del módulo web de la aplicación Cuadrito (Dots and Boxes).

Contiene:
    - Archivos estáticos (HTML, JS, CSS) en web/static/
    - API backend (FastAPI) en web/api.py
    - Inicialización de rutas y utilidades para servir recursos web.

Autor: Equipo Arazaca – UNAL
Fecha: 2025
"""

import os

# ---------------------------------------------------------------------
# RUTAS PRINCIPALES DEL MÓDULO
# ---------------------------------------------------------------------

# Ruta base del paquete 'web'
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Ruta del directorio de archivos estáticos
STATIC_DIR = os.path.join(BASE_DIR, "static")

# Verificación: si el directorio no existe, mostrar advertencia
if not os.path.isdir(STATIC_DIR):
    print(f"[web] ⚠️  Advertencia: el directorio estático no existe en {STATIC_DIR}")
else:
    print(f"[web] 📁 Directorio estático detectado en: {STATIC_DIR}")

# ---------------------------------------------------------------------
# FUNCIONES UTILITARIAS
# ---------------------------------------------------------------------

def get_static_path(filename: str) -> str:
    """
    Devuelve la ruta absoluta de un archivo dentro de /web/static/.

    :param filename: Nombre del archivo (por ejemplo, 'index.html')
    :return: Ruta absoluta al archivo solicitado.
    """
    return os.path.join(STATIC_DIR, filename)


def list_static_files():
    """
    Retorna una lista con todos los archivos dentro de web/static/.
    Incluye subdirectorios si existen.
    """
    files = []
    if os.path.isdir(STATIC_DIR):
        for root, _, filenames in os.walk(STATIC_DIR):
            for f in filenames:
                rel = os.path.relpath(os.path.join(root, f), STATIC_DIR)
                files.append(rel)
    return files

# ---------------------------------------------------------------------
# METADATOS DEL PAQUETE
# ---------------------------------------------------------------------

__all__ = ["BASE_DIR", "STATIC_DIR", "get_static_path", "list_static_files"]
__version__ = "1.1.0"
__author__ = "Equipo  – UNAL"
