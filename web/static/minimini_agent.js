/*
MiniMiniAgent v3 - "Alpha-Edge"
===============================
Agente predictivo con Minimax + poda α–β + heurística de cadenas.
Más rápido y estratégico.
Autor: ChatGPT rival de Arazaca – 2025
*/

class MiniMiniAgent extends Agent {
  constructor(maxDepth = 3) {
    super();
    this.ops = new Board();
    this.maxDepth = maxDepth;
  }

  init(color, board, time = 20000) {
    super.init(color, board, time);
    this.ply = color === "R" ? -1 : -2;
    this.opp = color === "R" ? -2 : -1;
  }

  cloneBoard(b) {
    return this.ops.clone(b);
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
    let myGain = 0, oppGain = 0, risk = 0, chain = 0;
    const size = after.length;

    for (let i = 0; i < size; i++) {
      for (let j = 0; j < size; j++) {
        const val = after[i][j];
        if (val === this.ply) myGain++;
        else if (val === this.opp) oppGain++;
        else if (val >= 0) {
          const bits =
            ((val & 1) ? 1 : 0) +
            ((val & 2) ? 1 : 0) +
            ((val & 4) ? 1 : 0) +
            ((val & 8) ? 1 : 0);
          if (bits === 3) risk++;
          if (bits === 2) chain++;
        }
      }
    }

    // ⚖️ Heurística combinada
    return (
      1000 * (myGain - oppGain) + // Prioriza cerrar cuadros
      12 * chain -                // Prefiere formar cadenas
      8 * risk                    // Evita riesgos
    );
  }

  minimax(board, depth, alpha, beta, maximizing, maxDepth) {
    if (depth >= maxDepth) return this.evaluate(this.initialBoard, board);
    const moves = this.ops.valid_moves(board);
    if (moves.length === 0) return this.evaluate(this.initialBoard, board);

    // === LIMITA MOVIMIENTOS (optimización) ===
    let sampleMoves = moves;
    if (moves.length > 80) {
      sampleMoves = [];
      for (let i = 0; i < 30; i++) {
        const idx = Math.floor(Math.random() * moves.length);
        sampleMoves.push(moves[idx]);
      }
    }

    if (maximizing) {
      let best = -Infinity;
      for (const [i, j, s] of sampleMoves) {
        const b2 = this.cloneBoard(board);
        const ok = this.ops.move(b2, i, j, s, this.ply);
        if (!ok) continue;
        const val = this.minimax(b2, depth + 1, alpha, beta, false, maxDepth);
        best = Math.max(best, val);
        alpha = Math.max(alpha, val);
        if (beta <= alpha) break; // poda β
      }
      return best;
    } else {
      let best = Infinity;
      for (const [i, j, s] of sampleMoves) {
        const b2 = this.cloneBoard(board);
        const ok = this.ops.move(b2, i, j, s, this.opp);
        if (!ok) continue;
        const val = this.minimax(b2, depth + 1, alpha, beta, true, maxDepth);
        best = Math.min(best, val);
        beta = Math.min(beta, val);
        if (beta <= alpha) break; // poda α
      }
      return best;
    }
  }

  compute(board, time) {
    this.initialBoard = this.cloneBoard(board);
    const moves = this.ops.valid_moves(board);
    if (moves.length === 0) return [0, 0, 0];

    // 🔁 Profundidad adaptativa
    const size = board.length;
    let maxDepth = 3;
    if (size >= 10) maxDepth = 2;
    if (size >= 15) maxDepth = 1;

    let bestMove = moves[0];
    let bestScore = -Infinity;

    // 🔎 Selección de movimientos a explorar
    let sampleMoves = moves;
    if (moves.length > 100) {
      sampleMoves = [];
      for (let i = 0; i < 40; i++) {
        const idx = Math.floor(Math.random() * moves.length);
        sampleMoves.push(moves[idx]);
      }
    }

    for (const move of sampleMoves) {
      const [i, j, s] = move;
      const b2 = this.cloneBoard(board);
      const ok = this.ops.move(b2, i, j, s, this.ply);
      if (!ok) continue;
      const val = this.minimax(b2, 1, -Infinity, Infinity, false, maxDepth);
      if (val > bestScore) {
        bestScore = val;
        bestMove = move;
      }
    }

    console.log(`[MiniMini v3] depth=${maxDepth} bestScore=${bestScore}`);
    return bestMove;
  }
}

// Export global
window.MiniMiniAgent = MiniMiniAgent;
