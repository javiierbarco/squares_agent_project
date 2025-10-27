class Agent {
  constructor() {}

  init(color, board, time = 20000) {
    this.color = color; // 'R' o 'Y'
    this.time = time;
    this.size = board.length;
  }

  compute(board, time) {
    // Debe ser implementado por cada agente
    return [0, 0, 0];
  }
}

/**
 * Clase Board
 * ------------
 * Contiene toda la lógica del tablero y validaciones.
 */
class Board {
  constructor() {}

  init(size) {
    const m = size - 1;
    const board = [];
    board[0] = [];
    board[0][0] = 9;
    for (let j = 1; j < m; j++) board[0][j] = 1;
    board[0][m] = 3;

    for (let i = 1; i < m; i++) {
      board[i] = [];
      board[i][0] = 8;
      for (let j = 1; j < m; j++) board[i][j] = 0;
      board[i][m] = 2;
    }

    board[m] = [];
    board[m][0] = 12;
    for (let j = 1; j < m; j++) board[m][j] = 4;
    board[m][m] = 6;

    return board;
  }

  clone(board) {
    const size = board.length;
    const b = [];
    for (let i = 0; i < size; i++) {
      b[i] = [];
      for (let j = 0; j < size; j++) b[i][j] = board[i][j];
    }
    return b;
  }

  check(board, r, c, s) {
    if (board[r][c] < 0) return false;
    const side = 1 << s;
    return (board[r][c] & side) !== side;
  }

  valid_moves(board) {
    const moves = [];
    const size = board.length;
    for (let i = 0; i < size; i++)
      for (let j = 0; j < size; j++)
        for (let s = 0; s < 4; s++)
          if (this.check(board, i, j, s)) moves.push([i, j, s]);
    return moves;
  }

  fill(board, i, j, color) {
    if (i < 0 || i === board.length || j < 0 || j === board.length) return board;

    if (board[i][j] === 15 || board[i][j] === 14) {
      board[i][j] = color;
      if (i > 0 && board[i - 1][j] >= 0) {
        board[i - 1][j] += 4;
        this.fill(board, i - 1, j, color);
      }
    }

    if (board[i][j] === 15 || board[i][j] === 13) {
      board[i][j] = color;
      if (j < board.length - 1 && board[i][j + 1] >= 0) {
        board[i][j + 1] += 8;
        this.fill(board, i, j + 1, color);
      }
    }

    if (board[i][j] === 15 || board[i][j] === 11) {
      board[i][j] = color;
      if (i < board.length - 1 && board[i + 1][j] >= 0) {
        board[i + 1][j] += 1;
        this.fill(board, i + 1, j, color);
      }
    }

    if (board[i][j] === 15 || board[i][j] === 7) {
      board[i][j] = color;
      if (j > 0 && board[i][j - 1] >= 0) {
        board[i][j - 1] += 2;
        this.fill(board, i, j - 1, color);
      }
    }
    return board;
  }

  move(board, i, j, s, color) {
    if (!this.check(board, i, j, s)) return false;

    const ocolor = color === -2 ? -1 : -2;
    board[i][j] |= 1 << s;
    board = this.fill(board, i, j, ocolor);

    if (i > 0 && s === 0) {
      board[i - 1][j] |= 4;
      board = this.fill(board, i - 1, j, ocolor);
    }
    if (i < board.length - 1 && s === 2) {
      board[i + 1][j] |= 1;
      board = this.fill(board, i + 1, j, ocolor);
    }
    if (j > 0 && s === 3) {
      board[i][j - 1] |= 2;
      board = this.fill(board, i, j - 1, ocolor);
    }
    if (j < board.length - 1 && s === 1) {
      board[i][j + 1] |= 8;
      board = this.fill(board, i, j + 1, ocolor);
    }

    return true;
  }

  winner(board) {
    let cr = 0, cy = 0;
    for (let i = 0; i < board.length; i++)
      for (let j = 0; j < board.length; j++)
        if (board[i][j] < 0) {
          if (board[i][j] === -1) cr++;
          else cy++;
        }
    if (cr + cy < board.length * board.length) return " ";
    if (cr > cy) return "R";
    if (cy > cr) return "Y";
    return " ";
  }

  print(board) {
    const size = board.length;
    const grid = [];
    for (let i = 0; i < size; i++) {
      for (let j = 0; j < size; j++) {
        const commands = [{ command: "-" }];
        if (board[i][j] < 0) {
          if (board[i][j] === -1) commands.push({ command: "R" });
          else commands.push({ command: "Y" });
          commands.push({ command: "u" }, { command: "r" }, { command: "d" }, { command: "l" });
        } else {
          if ((board[i][j] & 1) === 1) commands.push({ command: "u" });
          if ((board[i][j] & 2) === 2) commands.push({ command: "r" });
          if ((board[i][j] & 4) === 4) commands.push({ command: "d" });
          if ((board[i][j] & 8) === 8) commands.push({ command: "l" });
        }
        grid.push({ command: "translate", y: i, x: j, commands });
      }
    }

    const cmds = {
      r: true,
      x: 1.0 / size,
      y: 1.0 / size,
      command: "fit",
      commands: grid,
    };
    Konekti.client["canvas"].setText(cmds);
  }
}

/**
 * Agente aleatorio
 * ----------------
 * Selecciona un movimiento válido al azar.
 */
class RandomPlayer extends Agent {
  constructor() {
    super();
    this.board = new Board();
  }

  compute(board, time) {
    const moves = this.board.valid_moves(board);
    if (moves.length === 0) return [0, 0, 0];
    const index = Math.floor(Math.random() * moves.length);
    return moves[index];
  }
}

/**
 * Entorno de simulación
 * ---------------------
 * Controla los turnos, tiempos y detección de ganador.
 */
class Environment extends MainClient {
  constructor() {
    super();
    this.board = new Board();
  }

  setPlayers(players) {
    this.players = players;
  }

  init() {
    const redName = Konekti.vc("R").value;
    const yellowName = Konekti.vc("Y").value;
    const time = 1000 * parseInt(Konekti.vc("time").value);
    const size = parseInt(Konekti.vc("size").value);

    this.size = size;
    this.rb = this.board.init(size);
    this.board.print(this.rb);
    const b1 = this.board.clone(this.rb);
    const b2 = this.board.clone(this.rb);

    this.redName = redName;
    this.yellowName = yellowName;
    this.ptime = { R: time, Y: time };
    Konekti.vc("R_time").innerHTML = "" + time;
    Konekti.vc("Y_time").innerHTML = "" + time;
    this.player = "R";
    this.winner = "";

    this.players[redName].init("R", b1, time);
    this.players[yellowName].init("Y", b2, time);
  }

  play() {
    const TIME = 10;
    const x = this;
    const board = x.board;
    x.player = "R";
    Konekti.vc("log").innerHTML = "🏁 Esperando resultado...";
    x.init();
    let start = -1;

    function clock() {
      if (x.winner !== "") return;
      if (start === -1) setTimeout(clock, TIME);
      else {
        const end = Date.now();
        const elapsed = end - start;
        const remaining = x.ptime[x.player] - elapsed;
        Konekti.vc(x.player + "_time").innerHTML = remaining;
        if (remaining <= 0) {
          x.winner = (x.player === "R" ? x.yellowName : x.redName) +
            " ganó (timeout de " +
            (x.player === "R" ? x.redName : x.yellowName) +
            ")";
        } else setTimeout(clock, TIME);
      }
    }

    function compute() {
      const w = x.player === "R";
      const id = w ? x.redName : x.yellowName;
      const nid = w ? x.yellowName : x.redName;
      const b = board.clone(x.rb);
      start = Date.now();

      const action = x.players[id].compute(b, x.ptime[x.player]);
      const end = Date.now();

      const ply = w ? -1 : -2;
      const valid = board.move(x.rb, action[0], action[1], action[2], ply);

      if (!valid) {
        x.winner = nid + " ganó (movimiento inválido de " + id + ")";
      } else {
        const winner = board.winner(x.rb);
        if (winner !== " ") x.winner = winner;
        else {
          const elapsed = end - start;
          x.ptime[x.player] -= elapsed;
          Konekti.vc(x.player + "_time").innerHTML = x.ptime[x.player];
          if (x.ptime[x.player] <= 0) {
            x.winner = nid + " ganó (timeout de " + id + ")";
          } else {
            x.player = w ? "Y" : "R";
          }
        }
      }

      board.print(x.rb);
      start = -1;

      if (x.winner === "") setTimeout(compute, TIME);
      else Konekti.vc("log").innerHTML = "🏁 El ganador es " + x.winner;
    }

    board.print(x.rb);
    setTimeout(clock, 1000);
    setTimeout(compute, 1000);
  }
}

/**
 * Comandos de dibujo
 * ------------------
 * Define los colores y formas gráficas de los elementos.
 */
function custom_commands() {
  return [
    {
      command: " ",
      commands: [
        { command: "fillStyle", color: { red: 255, green: 255, blue: 255, alpha: 255 } },
        { command: "polygon", x: [0.2, 0.2, 0.8, 0.8], y: [0.2, 0.8, 0.8, 0.2] },
      ],
    },
    {
      command: "-",
      commands: [
        { command: "strokeStyle", color: { red: 128, green: 128, blue: 128, alpha: 255 } },
        { command: "polyline", x: [0, 0, 1, 1, 0], y: [0, 1, 1, 0, 0] },
      ],
    },
    {
      command: "u",
      commands: [
        { command: "strokeStyle", color: { red: 0, green: 0, blue: 255, alpha: 255 } },
        { command: "polyline", x: [0, 1], y: [0, 0] },
      ],
    },
    {
      command: "d",
      commands: [
        { command: "strokeStyle", color: { red: 0, green: 0, blue: 255, alpha: 255 } },
        { command: "polyline", x: [0, 1], y: [1, 1] },
      ],
    },
    {
      command: "r",
      commands: [
        { command: "strokeStyle", color: { red: 0, green: 0, blue: 255, alpha: 255 } },
        { command: "polyline", x: [1, 1], y: [0, 1] },
      ],
    },
    {
      command: "l",
      commands: [
        { command: "strokeStyle", color: { red: 0, green: 0, blue: 255, alpha: 255 } },
        { command: "polyline", x: [0, 0], y: [0, 1] },
      ],
    },
    {
      command: "R",
      commands: [
        { command: "fillStyle", color: { red: 255, green: 0, blue: 0, alpha: 255 } },
        { command: "polygon", x: [0.2, 0.2, 0.8, 0.8], y: [0.2, 0.8, 0.8, 0.2] },
      ],
    },
    {
      command: "Y",
      commands: [
        { command: "fillStyle", color: { red: 255, green: 255, blue: 0, alpha: 255 } },
        { command: "polygon", x: [0.2, 0.2, 0.8, 0.8], y: [0.2, 0.8, 0.8, 0.2] },
      ],
    },
  ];
}
