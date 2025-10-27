"""
Paquete squares
================

Implementa la lógica del juego "Cuadrito (Dots and Boxes)" en Python,
inspirado en la versión JavaScript del profesor (squares.js).

Contiene:
    - Clase Board: representa el tablero y operaciones sobre él
    - Clase Agent: clase base para los agentes
    - Clase RandomAgent: agente aleatorio (referencia)
    - Clase SmartAgent: agente inteligente (heurístico)
    
El paquete permite importar directamente las clases principales:

    from squares import Board, Agent, RandomAgent, SmartAgent

Autor: Equipo Arazaca – UNAL
Fecha: 2025
"""

from .board import Board
from .agent_base import Agent
from .random_agent import RandomAgent
from .smart_agent import SmartAgent

__all__ = ["Board", "Agent", "RandomAgent", "SmartAgent"]
