/*
ArazacaUltra.js
================
Agente “Arazaca Ultra” para Cuadrito (Dots & Boxes)
- Minimax + poda α/β
- Detención por tiempo
- Tabla de transposición (hash con simetrías simples)
- Heurística con conciencia de cadenas (celdas con 2 lados)
- Priorización de jugadas (cierra > seguras > neutrales > riesgosas)

Autor: Equipo Arazaca – UNAL 2025
*/

class ArazacaUltra extends Agent {
  constructor(opts = {}) {
    super();
    // Ajustes recomendados (puedes tocar si quieres)
    this.baseDepth    = opts.baseDepth    ?? 2;
    this.maxDepthCap  = opts.maxDepth     ?? 6;
    this.timeSliceCap = opts.timeSlice    ?? 320;   // ms por turno (cap duro)
    this.boxWeight    = opts.boxWeight    ?? 1500;  // cerrar cajas vale MUCHO
    this.chainBias    = opts.chainBias    ?? 10;    // favorecer estructura de cadenas (2 lados)
    this.threePenalty = opts.threePenalty ?? 11;    // castigo por crear 3-lados
    this.edgeBonus    = opts.edgeBonus    ?? 0.25;  // pequeño bono por borde

    this.ops = new Board();
    this.tt  = new Map(); // tabla de transposición
  }

  init(color, board, time = 20000) {
    super.init(color, board, time);
    // Códigos de colores usados en Board (-1/-2)
    this.ply = (color === "R") ? -1 : -2;
    this.opp = (color === "R") ? -2 : -1;
    this.tt.clear();
  }

  // ---------- utilidades básicas ----------
  clone(b){ return this.ops.clone(b); }
  bits(v){ return ((v & 1)?1:0) + ((v & 2)?1:0) + ((v & 4)?1:0) + ((v & 8)?1:0); }

  countBoxes(b, who){
    let n=0;
    for (let i=0;i<b.length;i++)
      for (let j=0;j<b.length;j++)
        if (b[i][j] === who) n++;
    return n;
  }
  countThrees(b){
    let n=0;
    for (let i=0;i<b.length;i++)
      for (let j=0;j<b.length;j++){
        const v=b[i][j];
        if (v>=0 && this.bits(v)===3) n++;
      }
    return n;
  }
  countTwos(b){
    let n=0;
    for (let i=0;i<b.length;i++)
      for (let j=0;j<b.length;j++){
        const v=b[i][j];
        if (v>=0 && this.bits(v)===2) n++;
      }
    return n;
  }

  // ---------- hash canónico (simetrías básicas) ----------
  boardKey(b){
    const a = JSON.stringify(b);
    const hr = JSON.stringify(b.map(r => [...r].reverse()));          // espejo horizontal
    const vr = JSON.stringify([...b].reverse());                       // espejo vertical
    const hv = JSON.stringify([...b].reverse().map(r => [...r].reverse()));
    return [a,hr,vr,hv].sort()[0];
  }
  ttGet(playerCode, depth, b){
    return this.tt.get(`${playerCode}:${depth}:${this.boardKey(b)}`);
  }
  ttSet(playerCode, depth, b, val){
    this.tt.set(`${playerCode}:${depth}:${this.boardKey(b)}`, val);
  }

  // ---------- heurística ----------
  evaluate(before, after){
    // Ganancia de cajas
    const myGain  = this.countBoxes(after, this.ply) - this.countBoxes(before, this.ply);
    const oppGain = this.countBoxes(after, this.opp) - this.countBoxes(before, this.opp);

    // Riesgo y cadenas
    const threeDiff = this.countThrees(after) - this.countThrees(before);
    const twos      = this.countTwos(after); // estructura tipo cadena (no abrir si no conviene)

    return (
      this.boxWeight * (myGain - oppGain)
      + this.chainBias * twos
      - this.threePenalty * Math.max(0, threeDiff)
    );
  }

  // ---------- ordenamiento de jugadas (mejor poda) ----------
  orderMoves(board, moves, who, reference){
    const th0 = this.countThrees(reference);
    const close = [], safe = [], neutral = [], risky = [];

    for (const [i,j,s] of moves){
      const b2 = this.clone(board);
      if (!this.ops.move(b2,i,j,s,who)) continue;

      const myDeltaBoxes = this.countBoxes(b2, who) - this.countBoxes(reference, who);
      if (myDeltaBoxes > 0){ close.push([i,j,s]); continue; }

      const diff3 = this.countThrees(b2) - th0;
      if (diff3 < 0){
        // a veces cerrar una “secuencia” reduce los 3-lados globales
        close.push([i,j,s]); continue;
      } else if (diff3 === 0){
        // bordo = un pelín mejor
        if (i===0 || j===0 || i===b2.length-1 || j===b2.length-1) safe.push([i,j,s]);
        else neutral.push([i,j,s]);
      } else {
        risky.push([i,j,s]);
      }
    }

    // ligera aleatoriedad para desempatar
    const shuffle = arr => { for(let k=arr.length-1;k>0;k--){ const r=(Math.random()*(k+1))|0; [arr[k],arr[r]]=[arr[r],arr[k]]; } return arr; };
    return [...shuffle(close), ...shuffle(safe), ...shuffle(neutral), ...shuffle(risky)];
  }

  // ---------- minimax + α/β + tiempo + transposición ----------
  search(board, depth, alpha, beta, maximizing, deadline, rootBefore){
    const me = maximizing ? this.ply : this.opp;

    // tiempo
    if (Date.now() >= deadline){
      return {score: this.evaluate(rootBefore, board), cutoff:true};
    }

    // memo
    const memo = this.ttGet(me, depth, board);
    if (memo !== undefined) return {score: memo, cutoff:false};

    // hoja
    if (depth === 0){
      const v = this.evaluate(rootBefore, board);
      this.ttSet(me, depth, board, v);
      return {score: v, cutoff:false};
    }

    // movimientos
    const moves = this.ops.valid_moves(board);
    if (moves.length === 0){
      const v = this.evaluate(rootBefore, board);
      this.ttSet(me, depth, board, v);
      return {score: v, cutoff:false};
    }

    // recorta branching en tableros muy abiertos
    let pool = moves;
    if (moves.length > 120){
      pool = [];
      for (let t=0;t<40;t++) pool.push(moves[(Math.random()*moves.length)|0]);
    }

    const ord = this.orderMoves(board, pool, me, board);

    if (maximizing){
      let best = -Infinity;
      for (const [i,j,s] of ord){
        const b2 = this.clone(board);
        if (!this.ops.move(b2,i,j,s,me)) continue;

        const r = this.search(b2, depth-1, alpha, beta, false, deadline, rootBefore);
        if (r.cutoff) return {score: best, cutoff:true};

        if (r.score > best) best = r.score;
        if (best > alpha) alpha = best;
        if (alpha >= beta) break; // poda
      }
      this.ttSet(me, depth, board, best);
      return {score: best, cutoff:false};
    } else {
      let best = Infinity;
      for (const [i,j,s] of ord){
        const b2 = this.clone(board);
        if (!this.ops.move(b2,i,j,s,me)) continue;

        const r = this.search(b2, depth-1, alpha, beta, true, deadline, rootBefore);
        if (r.cutoff) return {score: best, cutoff:true};

        if (r.score < best) best = r.score;
        if (best < beta) beta = best;
        if (alpha >= beta) break;
      }
      this.ttSet(me, depth, board, best);
      return {score: best, cutoff:false};
    }
  }

  // ---------- decisión principal ----------
  compute(board, time){
    const moves = this.ops.valid_moves(board);
    if (moves.length === 0) return [0,0,0];
    this.initialBoard = this.clone(board);

    // presupuesto de tiempo por jugada (conservador)
    const soft = Math.max(90, Math.floor((time || 1000)*0.15));
    const perMove = Math.min(this.timeSliceCap, soft);
    const deadline = Date.now() + perMove;

    // profundidad dinámica según tamaño/abertura
    const n = board.length;
    let startDepth = this.baseDepth + (n<=7 ? 1 : 0);
    // si hay muchos 3-lados, conviene pensar un poco más
    const threes = this.countThrees(board);
    if (threes >= Math.floor((n-1)*(n-1)*0.20)) startDepth += 1;
    const maxDepth = Math.min(this.maxDepthCap, startDepth+3);

    // ordenar raíz
    const ordered = this.orderMoves(board, moves, this.ply, board);

    let bestMove  = ordered[0];
    let bestScore = -Infinity;

    // iterative deepening hasta agotar tiempo
    for (let d=startDepth; d<=maxDepth; d++){
      if (Date.now() >= deadline) break;

      let localBest  = -Infinity;
      let localMove  = bestMove;

      for (const [i,j,s] of ordered){
        const b2 = this.clone(board);
        if (!this.ops.move(b2,i,j,s,this.ply)) continue;

        const r = this.search(b2, d-1, -Infinity, Infinity, false, deadline, board);
        if (r.cutoff) break;

        const val = r.score + ((i===0||j===0||i===b2.length-1||j===b2.length-1)? this.edgeBonus : 0);
        if (val > localBest){
          localBest = val;
          localMove = [i,j,s];
        }
      }

      if (Date.now() < deadline){
        bestScore = localBest;
        bestMove  = localMove;
      } else break;
    }

    // console.log(`[Ultra] t=${perMove}ms d<=${maxDepth} best=${bestScore.toFixed(1)}`);
    return bestMove;
  }
}

// export
window.ArazacaUltra = ArazacaUltra;
