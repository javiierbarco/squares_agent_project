/*
ArazacaPro V6 – juega segundo
α-β + orden de jugadas + fases + transposición + control de tiempo
Autor: Equipo Arazaca – UNAL 2025
*/

class ArazacaProV6 extends Agent {
  constructor(opts = {}) {
    super();
    this.ops = new Board();

    // Configuración
    this.baseDepth    = opts.baseDepth   ?? 2;   // profundidad base
    this.maxDepth     = opts.maxDepth    ?? 6;   // tope absoluto de búsqueda
    this.timeSliceMs  = opts.timeSliceMs ?? 300; // ms duros por turno
    this.sampleCap    = opts.sampleCap   ?? 48;  // muestreo cuando hay demasiadas jugadas

    // pesos (se adaptan según fase)
    this.wBox         = 1200;
    this.wChain       = 12;
    this.wThree       = -10;

    this.tt = new Map(); // tabla de transposición
  }

  init(color, board, time = 20000) {
    super.init(color, board, time);
    // Convención local de códigos de caja (igual que otros agentes)
    this.me  = color === "R" ? -1 : -2;
    this.opp = color === "R" ? -2 : -1;
    this.tt.clear();
  }

  // ---------- utilidades ----------
  clone(b) { return this.ops.clone(b); }
  bits(v){ return ((v&1)?1:0)+((v&2)?1:0)+((v&4)?1:0)+((v&8)?1:0); }

  countBoxes(b, who){
    let n=0; for(let i=0;i<b.length;i++) for(let j=0;j<b.length;j++) if (b[i][j]===who) n++; return n;
  }
  countThrees(b){
    let n=0; for(let i=0;i<b.length;i++) for(let j=0;j<b.length;j++){ const v=b[i][j]; if (v>=0 && this.bits(v)===3) n++; } return n;
  }
  countTwos(b){
    let n=0; for(let i=0;i<b.length;i++) for(let j=0;j<b.length;j++){ const v=b[i][j]; if (v>=0 && this.bits(v)===2) n++; } return n;
  }

  // fase del juego (apertura/medio/final) según relleno del tablero
  phase(b){
    const N=b.length*b.length;
    const taken = this.countBoxes(b,this.me)+this.countBoxes(b,this.opp);
    const p = taken/N;
    if (p < 0.15) return "opening";
    if (p < 0.65) return "mid";
    return "late";
  }

  // pesos por fase
  tuneWeights(b){
    const ph = this.phase(b);
    if (ph==="opening"){        // ultra seguro
      this.wBox   = 1000;
      this.wChain = 10;
      this.wThree = -14;
    }else if (ph==="mid"){      // equilibrado
      this.wBox   = 1200;
      this.wChain = 12;
      this.wThree = -10;
    }else{                      // final: aceptar 3-lados si me da control
      this.wBox   = 1400;
      this.wChain = 14;
      this.wThree = -7;
    }
  }

  // hash canónico con simetrías simples (para transposición)
  keyFor(b, depth, turn){
    const s0 = JSON.stringify(b);
    const s1 = JSON.stringify(b.map(r=>[...r].reverse()));
    const s2 = JSON.stringify([...b].reverse());
    const s3 = JSON.stringify([...b].reverse().map(r=>[...r].reverse()));
    const rep = [s0,s1,s2,s3].sort()[0];
    return `${turn}:${depth}:${rep}`;
  }

  // evaluación (diferente antes/después)
  evaluate(before, after){
    const myGain  = this.countBoxes(after,this.me)  - this.countBoxes(before,this.me);
    const opGain  = this.countBoxes(after,this.opp) - this.countBoxes(before,this.opp);
    const threeDf = this.countThrees(after) - this.countThrees(before);
    const chains  = this.countTwos(after);

    return this.wBox*(myGain - opGain) + this.wChain*chains + this.wThree*threeDf;
  }

  // ordenamiento de jugadas: cerrar, seguras, neutras, riesgosas
  orderMoves(board, moves, who, before){
    const close=[], safe=[], neutral=[], risky=[];
    const th0 = this.countThrees(before);

    for(const [i,j,s] of moves){
      const b2 = this.clone(board);
      if(!this.ops.move(b2,i,j,s,who)) continue;

      const myDelta = this.countBoxes(b2, who) - this.countBoxes(before, who);
      if (myDelta>0){ close.push([i,j,s]); continue; }

      const th = this.countThrees(b2);
      const diff = th - th0;
      if (diff < 0) close.push([i,j,s]);      // a veces reduce 3-lados (bueno)
      else if (diff === 0){
        // borde como “safe+”
        if (i===0||j===0||i===b2.length-1||j===b2.length-1) safe.push([i,j,s]);
        else neutral.push([i,j,s]);
      } else risky.push([i,j,s]);
    }

    const shuffle = arr=>{ for(let k=arr.length-1;k>0;k--){ const r=(Math.random()*(k+1))|0; [arr[k],arr[r]]=[arr[r],arr[k]];} return arr; };

    return [...shuffle(close), ...shuffle(safe), ...shuffle(neutral), ...shuffle(risky)];
  }

  // búsqueda α-β + transposición + corte por tiempo
  search(board, depth, alpha, beta, maximizing, deadline, rootBefore){
    // tiempo
    if (Date.now() >= deadline) {
      return {score: this.evaluate(rootBefore, board), cutoff:true};
    }

    // profundidad
    if (depth===0) return {score: this.evaluate(rootBefore, board), cutoff:false};

    // transposición
    const who = maximizing ? this.me : this.opp;
    const key = this.keyFor(board, depth, who);
    if (this.tt.has(key)) return {score:this.tt.get(key), cutoff:false};

    let moves = this.ops.valid_moves(board);
    if (moves.length===0){
      const v = this.evaluate(rootBefore,board);
      this.tt.set(key,v);
      return {score:v, cutoff:false};
    }

    if (moves.length > 160){            // recorte en posiciones gigantes
      const bag=[]; for(let k=0;k<this.sampleCap;k++) bag.push(moves[(Math.random()*moves.length)|0]);
      moves = bag;
    }

    const ord = this.orderMoves(board, moves, who, board);

    if (maximizing){
      let best = -Infinity;
      for(const [i,j,s] of ord){
        const b2 = this.clone(board);
        if(!this.ops.move(b2,i,j,s,who)) continue;

        const {score,cutoff} = this.search(b2, depth-1, alpha, beta, false, deadline, rootBefore);
        if (cutoff) return {score:best, cutoff:true};

        if (score>best) best=score;
        if (best>alpha) alpha=best;
        if (alpha>=beta) break;
      }
      this.tt.set(key,best);
      return {score:best, cutoff:false};
    }else{
      let best = Infinity;
      for(const [i,j,s] of ord){
        const b2 = this.clone(board);
        if(!this.ops.move(b2,i,j,s,who)) continue;

        const {score,cutoff} = this.search(b2, depth-1, alpha, beta, true, deadline, rootBefore);
        if (cutoff) return {score:best, cutoff:true};

        if (score<best) best=score;
        if (best<beta)  beta=best;
        if (alpha>=beta) break;
      }
      this.tt.set(key,best);
      return {score:best, cutoff:false};
    }
  }

  // ---------- decisión principal ----------
  compute(board, time){
    const moves = this.ops.valid_moves(board);
    if (moves.length===0) return [0,0,0];
    this.tuneWeights(board);                     // adaptar pesos por fase

    // presupuesto de tiempo (conservador)
    const soft = Math.max(80, Math.floor((time||1000)*0.12));
    const perMove = Math.min(this.timeSliceMs, soft);
    const deadline = Date.now()+perMove;

    // profundidad adaptativa
    const n = board.length;
    let startDepth = this.baseDepth + (n<=7 ? 1 : 0);
    let maxDepth   = Math.min(this.maxDepth, startDepth+3);

    // raíz: ordenar jugadas (jugar segundo → favorecer control de borde)
    const root = this.orderMoves(board, moves, this.me, board);
    let bestMove = root[0];
    let bestVal  = -Infinity;

    // iterative deepening
    for (let d=startDepth; d<=maxDepth; d++){
      if (Date.now()>=deadline) break;

      let localBest = bestVal;
      let localMove = bestMove;

      for (const [i,j,s] of root){
        const b2 = this.clone(board);
        if(!this.ops.move(b2,i,j,s,this.me)) continue;

        const {score,cutoff} = this.search(b2, d-1, -Infinity, Infinity, false, deadline, board);
        if (cutoff) break;

        // bono sutil por bordes (reduce branching futuro)
        const edge = (i===0||j===0||i===b2.length-1||j===b2.length-1) ? 0.25 : 0;
        const val = score + edge;

        if (val>localBest){ localBest=val; localMove=[i,j,s]; }
      }

      if (Date.now()<deadline){ bestVal=localBest; bestMove=localMove; } else break;
    }

    return bestMove;
  }
}

// export
window.ArazacaProV6 = ArazacaProV6;
