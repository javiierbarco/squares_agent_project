"""
board.py
========

Implementa la clase Board, encargada de representar y manipular
el tablero del juego Cuadrito (Dots and Boxes).

Basado en la guía del profesor (squares.js), pero reescrito en Python
para un entorno de agente inteligente.

Autor: Equipo Arazaca – UNAL
Fecha: 2025
"""

from copy import deepcopy


class Board:
    """
    Clase que representa el tablero y define todas las operaciones
    necesarias para gestionar el estado del juego.
    """

    def __init__(self, size: int = 3):
        """
        Inicializa un tablero cuadrado del tamaño indicado.

        :param size: Tamaño del tablero (número de casillas por lado)
        """
        self.size = size
        self.grid = self.init(size)

    # ----------------------------------------------------------------------
    # Métodos principales del tablero
    # ----------------------------------------------------------------------

    def init(self, size: int):
        """
        Crea un tablero vacío representado como una matriz de enteros.
        Cada celda contiene un valor de 0 a 15 (según las líneas dibujadas),
        o -1 / -2 si pertenece a un jugador (rojo o amarillo).

        :param size: Tamaño del tablero
        :return: Lista de listas representando el tablero
        """
        m = size - 1
        board = [[0] * size for _ in range(size)]

        # Configura bordes (imitando el JS original)
        board[0][0] = 9
        for j in range(1, m):
            board[0][j] = 1
        board[0][m] = 3

        for i in range(1, m):
            board[i][0] = 8
            for j in range(1, m):
                board[i][j] = 0
            board[i][m] = 2

        board[m][0] = 12
        for j in range(1, m):
            board[m][j] = 4
        board[m][m] = 6
        return board

    # ----------------------------------------------------------------------

    def clone(self):
        """
        Devuelve **otra instancia Board** (deepcopy) con el mismo estado.

        :return: Objeto Board idéntico al actual, pero independiente.
        """
        return deepcopy(self)

    # ----------------------------------------------------------------------

    def check(self, r: int, c: int, s: int) -> bool:
        """
        Determina si se puede dibujar una línea en (r,c) en el lado s.

        :param r: Fila
        :param c: Columna
        :param s: Lado (0=arriba, 1=derecha, 2=abajo, 3=izquierda)
        :return: True si el movimiento es válido
        """
        if self.grid[r][c] < 0:
            return False
        mask = 1 << s
        return (self.grid[r][c] & mask) != mask

    # ----------------------------------------------------------------------

    def valid_moves(self):
        """
        Retorna una lista de todos los movimientos posibles.

        :return: Lista de tuplas (fila, columna, lado)
        """
        moves = []
        for i in range(self.size):
            for j in range(self.size):
                for s in range(4):
                    if self.check(i, j, s):
                        moves.append((i, j, s))
        return moves

    # ----------------------------------------------------------------------

    def _fill(self, i: int, j: int, color: int):
        """
        Marca una casilla completada (-1 o -2) y propaga la actualización
        a las celdas vecinas, igual que en el código JS original.

        :param i: Fila
        :param j: Columna
        :param color: Código del jugador (-1 rojo, -2 amarillo)
        """
        if i < 0 or i >= self.size or j < 0 or j >= self.size:
            return

        cell = self.grid[i][j]
        if cell in (15, 14):
            self.grid[i][j] = color
            if i > 0 and self.grid[i - 1][j] >= 0:
                self.grid[i - 1][j] += 4
                self._fill(i - 1, j, color)

        if cell in (15, 13):
            self.grid[i][j] = color
            if j < self.size - 1 and self.grid[i][j + 1] >= 0:
                self.grid[i][j + 1] += 8
                self._fill(i, j + 1, color)

        if cell in (15, 11):
            self.grid[i][j] = color
            if i < self.size - 1 and self.grid[i + 1][j] >= 0:
                self.grid[i + 1][j] += 1
                self._fill(i + 1, j, color)

        if cell in (15, 7):
            self.grid[i][j] = color
            if j > 0 and self.grid[i][j - 1] >= 0:
                self.grid[i][j - 1] += 2
                self._fill(i, j - 1, color)

    # ----------------------------------------------------------------------

    def move(self, i: int, j: int, s: int, color: int) -> bool:
        """
        Realiza un movimiento en el tablero.

        :param i: Fila
        :param j: Columna
        :param s: Lado (0,1,2,3)
        :param color: -1 para rojo, -2 para amarillo
        :return: True si el movimiento fue válido, False si no
        """
        if not self.check(i, j, s):
            return False

        ocolor = -1 if color == -2 else -2
        self.grid[i][j] |= (1 << s)
        self._fill(i, j, ocolor)

        # actualiza celdas vecinas
        if i > 0 and s == 0:
            self.grid[i - 1][j] |= 4
            self._fill(i - 1, j, ocolor)
        if i < self.size - 1 and s == 2:
            self.grid[i + 1][j] |= 1
            self._fill(i + 1, j, ocolor)
        if j > 0 and s == 3:
            self.grid[i][j - 1] |= 2
            self._fill(i, j - 1, ocolor)
        if j < self.size - 1 and s == 1:
            self.grid[i][j + 1] |= 8
            self._fill(i, j + 1, ocolor)
        return True

    # ----------------------------------------------------------------------

    def winner(self) -> str:
        """
        Determina si hay un ganador.

        :return: 'R', 'Y' o ' ' (ninguno)
        """
        cr = cy = 0
        for i in range(self.size):
            for j in range(self.size):
                cell = self.grid[i][j]
                if cell < 0:
                    if cell == -1:
                        cr += 1
                    else:
                        cy += 1
        total = self.size * self.size
        if cr + cy < total:
            return " "
        if cr > cy:
            return "R"
        if cy > cr:
            return "Y"
        return " "

    # ----------------------------------------------------------------------

    def display(self):
        """
        Muestra el tablero en texto (para depuración).
        Incluye índice de fila para facilitar lectura.
        """
        for i, row in enumerate(self.grid):
            print(f"{i:02} | " + " ".join(f"{v:2}" for v in row))
        print("-" * (self.size * 3 + 5))
