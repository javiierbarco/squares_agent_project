"""
smart_agent.py
===============

Implementa un agente inteligente (SmartAgent) para el juego Cuadrito
(Dots and Boxes), basado en heurísticas simples pero efectivas.

Estrategia principal:
---------------------
1️⃣ Prioriza movimientos que cierren cuadros (maximiza su puntuación).
2️⃣ Evita movimientos que dejen casillas con 3 lados (riesgo de regalar punto).
3️⃣ En caso de empate, prefiere movimientos en los bordes.

Basado en la guía del profesor (squares.js) y adaptado a Python.

Autor: Equipo Arazaca – UNAL
Fecha: 2025
"""

from squares.agent_base import Agent
import math


class SmartAgent(Agent):
    """
    Agente inteligente que utiliza heurísticas de evaluación
    para decidir el siguiente movimiento.
    """

    def __init__(self, color: str = None):
        """
        Inicializa el agente con color opcional.
        """
        super().__init__(color)
        self.ply = None  # código interno del jugador (-1 o -2)
        self.opp = None  # código del oponente

    def init(self, color: str, board, time: int = 20000):
        """
        Inicializa el agente con su color y tiempo total.

        :param color: 'R' (rojo) o 'Y' (amarillo)
        :param board: Tablero inicial (instancia Board o matriz)
        :param time: Tiempo total en milisegundos
        """
        super().init(color, board, time)
        self.ply = -1 if color == "R" else -2  # código del jugador
        self.opp = -2 if color == "R" else -1  # código del oponente

    # ----------------------------------------------------------------------
    # Funciones auxiliares de evaluación
    # ----------------------------------------------------------------------

    def count_color(self, b, code: int) -> int:
        """Cuenta cuántas casillas pertenecen a un color."""
        count = 0
        for i in range(b.size):
            for j in range(b.size):
                if b.grid[i][j] == code:
                    count += 1
        return count

    def count_three_sides(self, b) -> int:
        """
        Cuenta las casillas con exactamente tres lados marcados.
        Estas casillas son 'peligrosas' (pueden regalar punto).
        """
        n = 0
        for i in range(b.size):
            for j in range(b.size):
                v = b.grid[i][j]
                if v >= 0:
                    bits = ((v & 1) > 0) + ((v & 2) > 0) + ((v & 4) > 0) + ((v & 8) > 0)
                    if bits == 3:
                        n += 1
        return n

    def evaluate(self, before, after) -> float:
        """
        Evalúa la diferencia entre dos tableros según una heurística.

        Heurística:
            score = 1000 * (ganancia propia) - 5 * (riesgo)
        """
        my_gain = self.count_color(after, self.ply) - self.count_color(before, self.ply)
        opp_gain = self.count_color(after, self.opp) - self.count_color(before, self.opp)
        gain = my_gain - opp_gain

        # Precomputar riesgos antes y después para ahorrar ciclos
        before_3 = self.count_three_sides(before)
        after_3 = self.count_three_sides(after)
        risk_delta = after_3 - before_3

        return 1000 * gain - 5 * risk_delta

    # ----------------------------------------------------------------------
    # Método principal de decisión
    # ----------------------------------------------------------------------

    def compute(self, board, time: int):
        """
        Selecciona el mejor movimiento según la heurística.

        :param board: Estado actual del tablero (instancia Board)
        :param time: Tiempo restante en milisegundos
        :return: Lista [fila, columna, lado]
        """
        moves = board.valid_moves()
        if not moves:
            return [0, 0, 0]

        best_move = None
        best_score = -math.inf

        for (i, j, s) in moves:
            simulated = board.clone()
            ok = simulated.move(i, j, s, self.ply)
            if not ok:
                continue

            score = self.evaluate(board, simulated)

            # Bonificación leve si el movimiento está en el borde
            if i == 0 or j == 0 or i == board.size - 1 or j == board.size - 1:
                score += 1

            if score > best_score:
                best_score = score
                best_move = (i, j, s)

        return list(best_move)
