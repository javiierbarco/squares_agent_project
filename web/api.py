"""
api.py
======

Servidor web principal del proyecto Cuadrito (Dots and Boxes)
utilizando FastAPI.

Sirve los archivos HTML, JS y CSS del directorio web/static/
y deja preparado el backend para futuras integraciones de IA
por medio de endpoints REST.

Autor: Equipo Arazaca – UNAL
Fecha: 2025
"""

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from web import STATIC_DIR, get_static_path

# Crear la aplicación FastAPI
app = FastAPI(
    title="Cuadrito UNAL - API (Equipo G1C)",
    description="Backend del juego de agentes inteligentes Cuadrito.",
    version="1.0.0",
)

# ---------------------------------------------------------------------
# MONTAJE DE ARCHIVOS ESTÁTICOS (frontend)
# ---------------------------------------------------------------------

# Monta el contenido de /web/static/ en la ruta /static
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

# Endpoint principal que sirve la interfaz (index.html)
@app.get("/", response_class=FileResponse, include_in_schema=False)
async def root():
    """
    Página principal del juego (index.html)
    """
    return FileResponse(get_static_path("index.html"))


# ---------------------------------------------------------------------
# ENDPOINTS DE EJEMPLO (para futura integración con IA en Python)
# ---------------------------------------------------------------------

@app.get("/api/health")
async def health_check():
    """
    Verifica el estado del servidor.
    """
    return {"status": "✅ online", "service": "Cuadrito UNAL API G1C"}


@app.post("/api/move")
async def compute_move(data: dict):
    """
    Ejemplo de endpoint para calcular un movimiento del agente Python.
    (En futuras versiones, se conectará con SmartAgent en Python)

    Espera un JSON con el estado actual del tablero.
    """
    example_move = [0, 0, 1]
    return JSONResponse(
        {
            "message": "Movimiento calculado por SmartAgent (ejemplo)",
            "move": example_move,
        }
    )


# ---------------------------------------------------------------------
# PUNTO DE ENTRADA
# ---------------------------------------------------------------------

if __name__ == "__main__":
    import uvicorn
    from datetime import datetime

    print(
        f"[{datetime.now().strftime('%H:%M:%S')}] 🚀 Iniciando servidor Cuadrito UNAL G1C en http://localhost:8000"
    )

    uvicorn.run(
        "web.api:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info",
    )
