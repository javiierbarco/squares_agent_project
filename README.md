# 🎮 Cuadrito UNAL – Juego de Agentes Inteligentes (Equipo G1C)

### Universidad Nacional de Colombia  
**Proyecto académico – Curso: Sistemas Inteligentes (2025-II)**  
**Equipo:** Arazaca  
**Integrantes:**  

---

## 🧠 Descripción general

**Cuadrito UNAL (Dots and Boxes)** es una implementación académica del clásico juego de tablero donde dos jugadores compiten dibujando líneas para cerrar cuadros.  
El objetivo del proyecto es desarrollar un **agente inteligente** capaz de jugar de manera autónoma y eficiente contra otros agentes.

El sistema combina **Python (backend con FastAPI)** y **JavaScript (frontend con Konekti.js)**, manteniendo compatibilidad con el entorno original del profesor.

---

## ⚙️ Arquitectura general del proyecto

```
squares_agent_project/
│
├── squares/              # Lógica del juego y agentes (Python)
│   ├── __init__.py
│   ├── board.py          # Motor del tablero (equivalente a Board.js)
│   ├── agent_base.py     # Clase base abstracta Agent
│   ├── random_agent.py   # Agente aleatorio (referencia)
│   └── smart_agent.py    # Agente inteligente heurístico (G1C)
│
├── web/                  # Interfaz web y servidor FastAPI
│   ├── __init__.py
│   ├── api.py            # Servidor principal con FastAPI
│   └── static/           
│       ├── index.html    # Interfaz principal Konekti
│       ├── squares.js    # Motor del juego del profesor
│       └── smart_agent.js# Agente inteligente en JavaScript
│
├── main.py               # Simulador de partidas entre agentes en consola
└── requirements.txt      # Dependencias del proyecto
```

---

## 🧩 Lógica del agente inteligente (SmartAgent)

### Estrategia heurística:
1. **Priorizar cierre de cuadros propios.**  
2. **Evitar movimientos que generen casillas con tres lados** (riesgo de regalar puntos).  
3. **Desempatar con movimientos en los bordes**, reduciendo riesgo inicial.

### Evaluación de movimientos:
\[
\text{Score} = 1000 \times (\text{ganancia propia}) - 5 \times (\text{riesgo})
\]

---

## 💻 Instalación y ejecución

### 1️⃣ Clonar el repositorio
```bash
git clone https://github.com/javiierbarco/squares_agent_project
cd squares_agent_project
```

### 2️⃣ Instalar dependencias
```bash
pip install -r requirements.txt
```

---

## 🚀 Ejecutar el backend (FastAPI)

Ejecuta el servidor local:
```bash
python -m web.api
```

**Salida esperada:**
```
[14:05:12] 🚀 Iniciando servidor Cuadrito UNAL G1C en http://localhost:8000
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
```

Luego abre en el navegador:  
👉 [http://localhost:8000](http://localhost:8000)

**El backend servirá:**
- `/` → Página principal (`index.html`)  
- `/static/...` → Archivos estáticos (`squares.js`, `smart_agent.js`, etc.)  
- `/api/health` → Verificación del estado del servidor  
- `/api/move` → Ejemplo de integración con el agente Python (modo demostración)

---

## 🧠 Simulación local en consola

Puedes ejecutar partidas entre dos agentes Python directamente desde terminal:

```bash
python main.py
```

**Ejemplo de salida:**
```
🎯 Iniciando partida (4x4)
🔴 SmartAgent  vs  🟡 RandomAgent
---------------------------------------------
00 |  9  1  3  1
01 |  8  0  2  0
02 | 12  4  6  0
03 |  4  4  6  0
-----------------------------

▶️ Turno R → movimiento [1, 0, 2]
...
⏰ Y (RandomAgent) agotó su tiempo. Gana R (SmartAgent)

🏁 Ganador final: R
---------------------------------------------
```

---

## 🌐 Ejecución en el navegador (interfaz gráfica)

1. Abre [http://localhost:8000](http://localhost:8000)
2. Completa la barra de configuración:
   - **Tiempo (segundos):** `15`
   - **Tamaño tablero (n):** `4`
   - **Jugador rojo:** `G1C`
   - **Jugador amarillo:** `rand1`
3. Pulsa **▶️ Iniciar partida**  
   El tablero se dibujará y los agentes comenzarán a jugar automáticamente.

---

## 🧰 Dependencias principales

| Paquete | Versión mínima | Descripción |
|----------|----------------|-------------|
| **FastAPI** | 0.115 | Framework backend moderno y rápido |
| **Uvicorn** | 0.23 | Servidor ASGI para FastAPI |
| **Pydantic** | 2.5 | Validación de modelos y datos JSON |
| **Httpx** | 0.25 | Cliente HTTP para pruebas de endpoints |
| **Pytest** | 7.4 | Framework de testing automatizado |
| **Numpy** | 1.26 | Cálculos heurísticos y simulaciones futuras |

---

## 📈 Extensiones futuras

- 🔗 Integrar el `SmartAgent` Python con la interfaz web vía `/api/move`.  
- 🧮 Implementar algoritmos **Minimax** y **Monte Carlo Tree Search (MCTS)**.  
- 🤝 Crear torneos automáticos multiagente.  
- 💾 Guardar y analizar estadísticas de partidas.

---

