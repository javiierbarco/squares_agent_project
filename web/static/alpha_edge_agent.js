/*
AlphaEdgeAgent.js
=================
Agente fuerte para Cuadrito (Dots & Boxes)
- Minimax + poda α/β
- Ordenamiento de jugadas (cierra > segura > riesgosa)
- Heurística con cadenas (lados=2), riesgo (lados=3) y boxes
- Iterative Deepening con límite duro de tiempo

Autor: Rival de Arazaca – 2025
*/

class AlphaEdgeAgent extends Agent {
  constructor(opts = {}) {
    super();
    this.ops = new Board();
    this.baseDepth = opts.baseDepth ?? 2;   // profundidad base
    this.maxDepth  = opts.maxDepth  ?? 6;   // tope absoluto
    this.timeSlice = opts.timeSlice ?? 220; // ms por turno (cap)
  }

  init(color, board, time = 20000) {
    super.init(color, board, time);
    this.ply = color === "R" ? -1 : -2;   // códigos del tablero
    this.opp = color === "R" ? -2 : -1;
    this.nodes = 0;
  }

  // ---------- utilidades ----------
  clone(b) { return this.ops.clone(b); }

  bits(v){ return ((v&1)?1:0)+((v&2)?1:0)+((v&4)?1:0)+((v&8)?1:0); }

  countBoxes(b, who){
    let n=0;
    for (let i=0;i<b.length;i++)
      for (let j=0;j<b.length;j++)
        if (b[i][j]===who) n++;
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

  // diferencia de cajas tras una jugada
  boxDelta(before, after, who){
    return this.countBoxes(after, who) - this.countBoxes(before, who);
  }

  // evaluación: cajas (muy alto) + cadenas (medio) - riesgo (3 lados)
  evaluate(before, after){
    const myGain  = this.boxDelta(before, after, this.ply);
    const oppGain = this.boxDelta(before, after, this.opp);
    const threeDiff = this.countThrees(after) - this.countThrees(before);
    const twoAfter  = this.countTwos(after);

    // pesos afinados para balance midgame / endgame
    return (
      1200 * (myGain - oppGain) + // cerrar cuadros manda
      10   * twoAfter           - // mantener cadenas potenciales
      9    * threeDiff            // evitar dejar terceras paredes
    );
  }

  // ordena movimientos: cerrar > seguro (=no aumenta 3-lados) > riesgoso
  orderedMoves(board, moves, who, before){
    const close=[], safe=[], risky=[];
    for (const [i,j,s] of moves){
      const b2 = this.clone(board);
      const ok = this.ops.move(b2, i, j, s, who);
      if (!ok) continue;
      const delta = this.boxDelta(before, b2, who);
      if (delta>0){ close.push([i,j,s]); continue; }
      const risk = this.countThrees(b2) - this.countThrees(before);
      if (risk<=0) safe.push([i,j,s]); else risky.push([i,j,s]);
    }
    // ligera aleatoriedad para no ser predecible
    const shuffle = arr=>{
      for(let k=arr.length-1;k>0;k--){
        const r=(Math.random()* (k+1))|0; [arr[k],arr[r]]=[arr[r],arr[k]];
      }
      return arr;
    };
    return [...shuffle(close), ...shuffle(safe), ...shuffle(risky)];
  }

  // ---------- minimax + poda α/β con control de tiempo ----------
  search(board, depth, alpha, beta, maximizing, deadline, rootBefore){
    // corte por tiempo
    if (Date.now() >= deadline) return {score: this.evaluate(rootBefore, board), cutoff:true};
    if (depth===0)               return {score: this.evaluate(rootBefore, board), cutoff:false};

    const moves = this.ops.valid_moves(board);
    if (moves.length===0)        return {score: this.evaluate(rootBefore, board), cutoff:false};

    const who = maximizing ? this.ply : this.opp;
    const ord = this.orderedMoves(board, moves, who, board);

    if (maximizing){
      let best = -Infinity;
      for (const [i,j,s] of ord){
        const b2 = this.clone(board);
        if (!this.ops.move(b2,i,j,s,who)) continue;
        this.nodes++;
        const {score, cutoff} = this.search(b2, depth-1, alpha, beta, !maximizing, deadline, rootBefore);
        if (cutoff) return {score: best, cutoff:true};
        if (score>best) best = score;
        if (best>alpha) alpha=best;
        if (alpha>=beta) break; // poda β
      }
      return {score: best, cutoff:false};
    }else{
      let best =  Infinity;
      for (const [i,j,s] of ord){
        const b2 = this.clone(board);
        if (!this.ops.move(b2,i,j,s,who)) continue;
        this.nodes++;
        const {score, cutoff} = this.search(b2, depth-1, alpha, beta, !maximizing, deadline, rootBefore);
        if (cutoff) return {score: best, cutoff:true};
        if (score<best) best = score;
        if (best<beta)  beta=best;
        if (alpha>=beta) break; // poda α
      }
      return {score: best, cutoff:false};
    }
  }

  // ---------- decisión principal ----------
  compute(board, time){
    // presupuesto de tiempo conservador (no bloquear la UI)
    const perMove = Math.max(80, Math.min(this.timeSlice, Math.floor((time||1000)*0.12)));
    const deadline = Date.now() + perMove;

    const moves = this.ops.valid_moves(board);
    if (moves.length===0) return [0,0,0];

    // depth adaptativo por tamaño y cantidad de jugadas
    const n = board.length;
    let maxTry = this.baseDepth + (n<=7 ? 2 : n<=10 ? 1 : 0);
    maxTry = Math.min(maxTry, this.maxDepth);

    // move ordering ya considera cierres/seguridad
    const rootOrdered = this.orderedMoves(board, moves, this.ply, board);

    let bestMove = rootOrdered[0];
    let bestScore = -Infinity;

    // Iterative Deepening
    for (let d=1; d<=maxTry; d++){
      // si ya no hay tiempo, nos quedamos con lo mejor conocido
      if (Date.now() >= deadline) break;

      let localBestMove = bestMove;
      let localBest = -Infinity;

      for (const [i,j,s] of rootOrdered){
        const b2 = this.clone(board);
        if (!this.ops.move(b2,i,j,s,this.ply)) continue;

        const {score, cutoff} = this.search(b2, d-1, -Infinity, Infinity, false, deadline, board);
        if (cutoff) break; // sin tiempo para seguir en esta profundidad

        const edgeBonus = (i===0 || j===0 || i===b2.length-1 || j===b2.length-1) ? 0.3 : 0;
        const val = score + edgeBonus;

        if (val>localBest){
          localBest = val;
          localBestMove = [i,j,s];
        }
      }

      // si logramos terminar la profundidad d, actualizamos mejor global
      if (Date.now() < deadline){
        bestMove = localBestMove;
        bestScore = localBest;
      }else{
        break;
      }
    }

    // console.log(`[AlphaEdge] nodes=${this.nodes} best=${bestScore.toFixed(1)} ms=${this.timeSlice}`);
    return bestMove;
  }
}

// export
window.AlphaEdgeAgent = AlphaEdgeAgent;
