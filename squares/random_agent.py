"""
random_agent.py
================

Implementa un agente aleatorio para el juego Cuadrito (Dots and Boxes).

Este agente elige un movimiento válido al azar, sin aplicar
ninguna estrategia. Se usa principalmente como referencia
o para pruebas del entorno.

Basado en la clase RandomPlayer del archivo squares.js del profesor.

Autor: Equipo Arazaca – UNAL
Fecha: 2025
"""

import random
from squares.agent_base import Agent
from squares.board import Board


class RandomAgent(Agent):
    """
    Agente que juega seleccionando un movimiento aleatorio válido.
    """

    def __init__(self, color: str = None):
        """
        Inicializa el agente aleatorio con un color opcional.
        """
        super().__init__(color)
        self.board = Board()  # Instancia de tablero auxiliar

    def compute(self, board: Board, time: int):
        """
        Selecciona un movimiento aleatorio de entre los válidos.

        :param board: Estado actual del tablero (instancia de Board)
        :param time: Tiempo restante en milisegundos
        :return: Lista [fila, columna, lado]
        """
        moves = board.valid_moves()
        if not moves:
            return [0, 0, 0]  # Fallback si no hay movimientos válidos

        move = random.choice(moves)
        return list(move)
