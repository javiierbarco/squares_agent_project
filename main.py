"""
main.py
=======

Simula partidas del juego Cuadrito (Dots and Boxes)
entre diferentes agentes inteligentes.

Basado en la guía del profesor (squares.js),
adaptado para ejecución en Python puro.

Autor: Equipo Arazaca – UNAL
Fecha: 2025
"""

import time
from squares import Board, RandomAgent, SmartAgent


class Environment:
    """
    Entorno de simulación entre dos agentes.
    Controla turnos, tiempo y determina el ganador.
    """

    def __init__(self, size=4, time_limit=20000):
        self.board = Board(size)
        self.time_limit = time_limit
        self.remaining = {"R": time_limit, "Y": time_limit}
        self.player = "R"
        self.winner = None

    def play(self, red_agent, yellow_agent):
        """
        Ejecuta la partida entre los dos agentes dados.

        :param red_agent: instancia de Agent (color 'R')
        :param yellow_agent: instancia de Agent (color 'Y')
        """
        red_agent.init("R", self.board.grid, self.time_limit)
        yellow_agent.init("Y", self.board.grid, self.time_limit)

        print(f"\n🎯 Iniciando partida ({self.board.size}x{self.board.size})")
        print(f"🔴 {red_agent.__class__.__name__}  vs  🟡 {yellow_agent.__class__.__name__}")
        print("-" * 45)
        self.board.display()

        while True:
            start_time = time.time()
            current_agent = red_agent if self.player == "R" else yellow_agent
            color_code = -1 if self.player == "R" else -2

            # Calcular jugada del agente
            move = current_agent.compute(self.board, self.remaining[self.player])
            end_time = time.time()

            # Calcular tiempo transcurrido y actualizar
            elapsed = (end_time - start_time) * 1000  # ms
            self.remaining[self.player] -= elapsed

            # Validar si el tiempo se agotó antes de aplicar movimiento
            if self.remaining[self.player] <= 0:
                self.winner = "Y" if self.player == "R" else "R"
                loser_name = type(red_agent if self.player == "R" else yellow_agent).__name__
                winner_name = type(yellow_agent if self.player == "R" else red_agent).__name__
                print(f"⏰ {self.player} ({loser_name}) agotó su tiempo. "
                      f"Gana {self.winner} ({winner_name})")
                break

            # Aplicar movimiento
            valid = self.board.move(*move, color=color_code)
            if not valid:
                self.winner = "Y" if self.player == "R" else "R"
                name = type(current_agent).__name__
                print(f"❌ Movimiento inválido de {self.player} ({name}): {move}. "
                      f"Gana {self.winner}")
                break

            # Mostrar estado del tablero
            current_winner = self.board.winner()
            print(f"\n▶️ Turno {self.player} → movimiento {move}")
            self.board.display()

            if current_winner != " ":
                self.winner = current_winner
                break

            # Cambio de turno
            self.player = "Y" if self.player == "R" else "R"

        print(f"\n🏁 Ganador final: {self.winner}")
        print("-" * 45)


# --------------------------------------------------------------------------
# Punto de entrada principal
# --------------------------------------------------------------------------

if __name__ == "__main__":
    # Configuración inicial
    size = 4
    time_limit = 20000  # milisegundos

    # Agentes disponibles
    red_agent = SmartAgent(color="R")
    yellow_agent = RandomAgent(color="Y")

    # Crear entorno y ejecutar partida
    env = Environment(size=size, time_limit=time_limit)
    env.play(red_agent, yellow_agent)
