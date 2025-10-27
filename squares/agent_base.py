"""
agent_base.py
==============

Define la clase abstracta Agent, base para todos los agentes
del juego Cuadrito (Dots and Boxes).

Cada agente debe heredar de Agent y sobreescribir el método:
    - compute(board, time): retorna la jugada a realizar.

Basado en la guía del profesor (squares.js).

Autor: Equipo Arazaca – UNAL
Fecha: 2025
"""

from abc import ABC, abstractmethod


class Agent(ABC):
    """
    Clase base abstracta para un agente de Cuadrito.
    Define la estructura mínima que deben cumplir los agentes.
    """

    def __init__(self, color: str = None):
        """
        Inicializa el agente con un color ('R' o 'Y').

        :param color: Color del jugador ('R' para rojo o 'Y' para amarillo)
        """
        self.color = color
        self.time_total = 20000  # tiempo total en milisegundos
        self.size = None         # tamaño del tablero (nxn)

    # ----------------------------------------------------------------------
    # Métodos base
    # ----------------------------------------------------------------------

    def init(self, color: str, board, time: int = 20000):
        """
        Inicializa el agente con los parámetros de la partida.

        :param color: Color asignado al agente ('R' o 'Y')
        :param board: Estado inicial (lista de listas al estilo JS) o instancia Board
        :param time: Tiempo total asignado (en milisegundos)
        """
        self.color = color
        self.time_total = time
        self.size = len(board)

    # ----------------------------------------------------------------------

    @abstractmethod
    def compute(self, board, time: int):
        """
        Determina el próximo movimiento del agente.

        :param board: Estado actual del tablero (objeto Board o lista de listas)
        :param time: Tiempo restante en milisegundos
        :return: Lista [fila, columna, lado]
                 donde lado puede ser:
                     0 = arriba
                     1 = derecha
                     2 = abajo
                     3 = izquierda
        """
        pass
