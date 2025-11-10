/*
ArazacaAgent.js
===============

Agente inteligente (Arazaca – Minimax + α-β pruning optimizado)
para el juego Cuadrito (Dots and Boxes).

Autor: Equipo Arazaca – UNAL 2025
*/

class ArazacaAgent extends Agent {
  constructor(maxDepth = 4) {
    super();
    this.ops = new Board();
    this.maxDepth = maxDepth;
    this.ply = null;
    this.opp = null;
  }

  init(color, board, time = 20000) {
    super.init(color, board, time);
    this.ply = color === "R" ? -1 : -2;
    this.opp = color === "R" ? -2 : -1;
  }

  // ---------- utilidades ----------
  cloneBoard(b) {
    return this.ops.clone(b);
  }

  countColor(b, code) {
    let n = 0;
    for (let i = 0; i < b.length; i++)
      for (let j = 0; j < b.length; j++)
        if (b[i][j] === code) n++;
    return n;
  }

  countThreeSides(b) {
    let n = 0;
    for (let i = 0; i < b.length; i++)
      for (let j = 0; j < b.length; j++) {
        const v = b[i][j];
        if (v >= 0) {
          const bits =
            ((v & 1) ? 1 : 0) +
            ((v & 2) ? 1 : 0) +
            ((v & 4) ? 1 : 0) +
            ((v & 8) ? 1 : 0);
          if (bits === 3) n++;
        }
      }
    return n;
  }

  evaluate(before, after) {
    const myGain =
      this.countColor(after, this.ply) - this.countColor(before, this.ply);
    const oppGain =
      this.countColor(after, this.opp) - this.countColor(before, this.opp);
    const gain = myGain - oppGain;
    const risk =
      this.countThreeSides(after) - this.countThreeSides(before);
    return 1000 * gain - 6 * risk;
  }

  // ---------- minimax con α-β ----------
  minimax(board, depth, alpha, beta, maximizing, depthLimit = this.maxDepth) {
    if (depth >= depthLimit) return this.evaluate(this.initialBoard, board);

    const moves = this.ops.valid_moves(board);
    if (moves.length === 0) return this.evaluate(this.initialBoard, board);

    if (maximizing) {
      let value = -Infinity;
      for (const move of moves) {
        const [i, j, s] = move;
        const b2 = this.cloneBoard(board);
        const ok = this.ops.move(b2, i, j, s, this.ply);
        if (!ok) continue;
        const val = this.minimax(b2, depth + 1, alpha, beta, false, depthLimit);
        value = Math.max(value, val);
        alpha = Math.max(alpha, val);
        if (beta <= alpha) break; // poda beta
      }
      return value;
    } else {
      let value = Infinity;
      for (const move of moves) {
        const [i, j, s] = move;
        const b2 = this.cloneBoard(board);
        const ok = this.ops.move(b2, i, j, s, this.opp);
        if (!ok) continue;
        const val = this.minimax(b2, depth + 1, alpha, beta, true, depthLimit);
        value = Math.min(value, val);
        beta = Math.min(beta, val);
        if (beta <= alpha) break; // poda alpha
      }
      return value;
    }
  }

  // ---------- decisión principal ----------
  compute(board, time) {
    const moves = this.ops.valid_moves(board);
    if (moves.length === 0) return [0, 0, 0];
    this.initialBoard = this.cloneBoard(board);

    // --- control de profundidad dinámico ---
    const n = board.length;
    if (n >= 12) this.maxDepth = 2;
    else if (n >= 8) this.maxDepth = 3;
    else this.maxDepth = 4;

    let bestMove = moves[0];
    let bestScore = -Infinity;

    const startTime = Date.now();
    const maxMillis = Math.min(time, 3000); // nunca más de 3 seg por jugada

    for (const move of moves) {
      if (Date.now() - startTime > maxMillis) break; // corte por tiempo

      const [i, j, s] = move;
      const b2 = this.cloneBoard(board);
      const ok = this.ops.move(b2, i, j, s, this.ply);
      if (!ok) continue;

      const depthLimit = moves.length < 30 ? this.maxDepth : this.maxDepth - 1;
      const val = this.minimax(b2, 1, -Infinity, Infinity, false, depthLimit);

      const edgeBonus =
        i === 0 || j === 0 || i === b2.length - 1 || j === b2.length - 1
          ? 0.3
          : 0;
      const totalScore = val + edgeBonus;

      if (totalScore > bestScore) {
        bestScore = totalScore;
        bestMove = move;
      }
    }

    console.log(
      `[Arazaca] depth=${this.maxDepth}, moves=${moves.length}, bestScore=${bestScore}`
    );
    return bestMove;
  }
}

// ---------- export ----------
window.ArazacaAgent = ArazacaAgent;
