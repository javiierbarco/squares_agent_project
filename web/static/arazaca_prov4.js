/*
ArazacaPro v5 — jugar segundo
α-β + transposición + ordenamiento + control de cadenas + mini Monte Carlo
Autor: Equipo Arazaca – UNAL 2025
*/
class ArazacaProv5Agent extends Agent {
  constructor(opts = {}) {
    super();
    this.ops = new Board();

    // Tuning principal (pensado para ir de segundo)
    this.baseDepth    = opts.baseDepth    ?? 2;
    this.maxDepth     = opts.maxDepth     ?? 5;    // tope de profundidades
    this.timeSlice    = opts.timeSlice    ?? 260;  // ms máximos por jugada
    this.boxWeight    = opts.boxWeight    ?? 1200; // cerrar cuadro manda
    this.twoBias      = opts.twoBias      ?? 10;   // favorece cadenas (2 lados)
    this.threePenalty = opts.threePenalty ?? 12;   // evita regalar 3 lados
    this.edgeBonus    = opts.edgeBonus    ?? 0.2;  // pref. ligera por borde
    this.parityBias   = opts.parityBias   ?? 6;    // paridad de cadenas
    this.rollouts     = opts.rollouts     ?? 12;   // simulaciones rápidas
    this.sampleCap    = opts.sampleCap    ?? 36;   // top jugadas a muestrear

    this.tt = new Map(); // tabla de transposición
  }

  init(color, board, time = 20000) {
    super.init(color, board, time);
    this.ply = (color === "R") ? -1 : -2;
    this.opp = (color === "R") ? -2 : -1;
    this.tt.clear();
  }

  // ===== Utilidades de tablero =====
  clone(b){ return this.ops.clone(b); }
  bits(v){ return ((v&1)?1:0)+((v&2)?1:0)+((v&4)?1:0)+((v&8)?1:0); }

  countBoxes(b, who){
    let n=0; for(let i=0;i<b.length;i++) for(let j=0;j<b.length;j++) if(b[i][j]===who) n++; return n;
  }
  countThrees(b){
    let n=0; for(let i=0;i<b.length;i++) for(let j=0;j<b.length;j++){ const v=b[i][j]; if(v>=0 && this.bits(v)===3) n++; } return n;
  }
  countTwos(b){
    let n=0; for(let i=0;i<b.length;i++) for(let j=0;j<b.length;j++){ const v=b[i][j]; if(v>=0 && this.bits(v)===2) n++; } return n;
  }

  // Conteo de cadenas (componentes de celdas con 2 lados)
  chainStats(b){
    const n=b.length, seen=Array.from({length:n},()=>Array(n).fill(false));
    const inside=(i,j)=>i>=1&&i<n-1&&j>=1&&j<n-1; // sólo cajas válidas
    const isTwo=(i,j)=>inside(i,j)&&b[i][j]>=0&&this.bits(b[i][j])===2;
    const dirs=[[1,0],[ -1,0],[0,1],[0,-1]];
    let chains=0, totalLen=0;

    for(let i=1;i<n-1;i++){
      for(let j=1;j<n-1;j++){
        if(!isTwo(i,j) || seen[i][j]) continue;
        chains++; let len=0;
        const q=[[i,j]]; seen[i][j]=true;
        while(q.length){
          const [r,c]=q.pop(); len++;
          for(const [dr,dc] of dirs){
            const nr=r+dr, nc=c+dc;
            if(nr<1||nr>=n-1||nc<1||nc>=n-1) continue;
            if(!seen[nr][nc] && isTwo(nr,nc)) { seen[nr][nc]=true; q.push([nr,nc]); }
          }
        }
        totalLen += len;
      }
    }
    return { chains, totalLen, isEven: (chains%2===0) };
  }

  // Serial canónico (con algunas simetrías) para TT
  canonical(b){
    const s0 = JSON.stringify(b);
    const r1 = JSON.stringify(b.map(row=>[...row].reverse()));
    const r2 = JSON.stringify([...b].reverse());
    const r3 = JSON.stringify([...b].reverse().map(row=>[...row].reverse()));
    return [s0,r1,r2,r3].sort()[0];
  }
  ttGet(code, depth, b){ return this.tt.get(`${code}:${depth}:${this.canonical(b)}`); }
  ttSet(code, depth, b, val){ this.tt.set(`${code}:${depth}:${this.canonical(b)}`, val); }

  // ===== Heurística =====
  evaluate(before, after){
    const myGain  = this.countBoxes(after, this.ply) - this.countBoxes(before, this.ply);
    const oppGain = this.countBoxes(after, this.opp) - this.countBoxes(before, this.opp);
    const d3      = this.countThrees(after) - this.countThrees(before);
    const twos    = this.countTwos(after);
    const { chains, isEven } = this.chainStats(after);

    // Si vamos de SEGUNDO, preferimos #cadenas PAR; si fuéramos primero, impar
    const wantEven = true;
    const parityScore = (isEven === wantEven ? +1 : -1) * this.parityBias * Math.max(1, chains);

    return (
      this.boxWeight * (myGain - oppGain) +
      this.twoBias   * twos +
      parityScore    -
      this.threePenalty * d3
    );
  }

  // Ordena jugadas: cierra > seguras > neutrales > riesgosas
  orderMoves(board, moves, who, refBoard){
    const close=[], safe=[], neutral=[], risky=[];
    const th0 = this.countThrees(refBoard);
    for(const [i,j,s] of moves){
      const b2=this.clone(board);
      if(!this.ops.move(b2,i,j,s,who)) continue;
      const myDelta = this.countBoxes(b2,who) - this.countBoxes(refBoard,who);
      if(myDelta>0){ close.push([i,j,s]); continue; }
      const d3 = this.countThrees(b2) - th0;
      if(d3<0){ close.push([i,j,s]); continue; }     // a veces reduce 3-lados
      if(d3===0){
        if(i===0||j===0||i===b2.length-1||j===b2.length-1) safe.push([i,j,s]);
        else neutral.push([i,j,s]);
      } else risky.push([i,j,s]);
    }
    const shuffle=a=>{ for(let k=a.length-1;k>0;k--){ const r=(Math.random()*(k+1))|0; [a[k],a[r]]=[a[r],a[k]];} return a; };
    return [...shuffle(close),...shuffle(safe),...shuffle(neutral),...shuffle(risky)];
  }

  // ===== Búsqueda α-β con TT y deadline =====
  search(board, depth, alpha, beta, maximizing, deadline, rootBefore){
    const code = maximizing ? this.ply : this.opp;
    const cached = this.ttGet(code, depth, board);
    if(cached !== undefined) return { score: cached, cutoff:false };

    if(Date.now() >= deadline) return { score: this.evaluate(rootBefore,board), cutoff:true };
    if(depth===0){
      const v=this.evaluate(rootBefore,board); this.ttSet(code,depth,board,v); return { score:v, cutoff:false };
    }

    const moves = this.ops.valid_moves(board);
    if(moves.length===0){
      const v=this.evaluate(rootBefore,board); this.ttSet(code,depth,board,v); return { score:v, cutoff:false };
    }

    // Reducir branching en posiciones gigantes
    let pool = moves;
    if(moves.length > 140){
      pool = []; for(let t=0;t<Math.min(this.sampleCap,moves.length);t++) pool.push(moves[(Math.random()*moves.length)|0]);
    }

    const ord = this.orderMoves(board,pool,code,board);

    if(maximizing){
      let best=-Infinity;
      for(const [i,j,s] of ord){
        const b2=this.clone(board); if(!this.ops.move(b2,i,j,s,code)) continue;
        const { score, cutoff } = this.search(b2, depth-1, alpha, beta, false, deadline, rootBefore);
        if(cutoff) return { score: best, cutoff:true };
        if(score>best) best=score;
        if(best>alpha) alpha=best;
        if(alpha>=beta) break;
      }
      this.ttSet(code, depth, board, best);
      return { score: best, cutoff:false };
    }else{
      let best=Infinity;
      for(const [i,j,s] of ord){
        const b2=this.clone(board); if(!this.ops.move(b2,i,j,s,code)) continue;
        const { score, cutoff } = this.search(b2, depth-1, alpha, beta, true, deadline, rootBefore);
        if(cutoff) return { score: best, cutoff:true };
        if(score<best) best=score;
        if(best<beta) beta=best;
        if(alpha>=beta) break;
      }
      this.ttSet(code, depth, board, best);
      return { score: best, cutoff:false };
    }
  }

  // ===== Rollout seguro (Monte Carlo rápido) =====
  rolloutEval(board, who, steps=24){
    let b=this.clone(board), current=who;
    const three0=this.countThrees(b);
    let closedMy=0, closedOpp=0;

    for(let t=0;t<steps;t++){
      const moves=this.ops.valid_moves(b);
      if(moves.length===0) break;

      // preferir movimiento que NO aumente 3-lados; si hay cierre, tomarlo
      let chosen=null, finish=[], safe=[], rest=[];
      for(const [i,j,s] of moves){
        const b2=this.clone(b); this.ops.move(b2,i,j,s,current);
        const d3=this.countThrees(b2)-this.countThrees(b);
        const gain = this.countBoxes(b2,current)-this.countBoxes(b,current);
        if(gain>0) finish.push([i,j,s]);
        else if(d3<=0) safe.push([i,j,s]); else rest.push([i,j,s]);
      }
      if(finish.length) chosen=finish[(Math.random()*finish.length)|0];
      else if(safe.length) chosen=safe[(Math.random()*safe.length)|0];
      else chosen = rest[(Math.random()*rest.length)|0];

      this.ops.move(b, chosen[0], chosen[1], chosen[2], current);
      current = (current===this.ply? this.opp : this.ply);
    }

    closedMy  = this.countBoxes(b,this.ply) - this.countBoxes(board,this.ply);
    closedOpp = this.countBoxes(b,this.opp) - this.countBoxes(board,this.opp);
    const d3  = this.countThrees(b) - three0;
    return this.boxWeight*(closedMy-closedOpp) - this.threePenalty*d3 + this.twoBias*this.countTwos(b);
  }

  // ===== Decisión principal =====
  compute(board, time){
    const moves=this.ops.valid_moves(board);
    if(moves.length===0) return [0,0,0];
    this.initialBoard = this.clone(board);

    // Presupuesto de tiempo conservador
    const perMoveSoft = Math.max(90, Math.floor((time||1000)*0.12));
    const perMove = Math.min(this.timeSlice, perMoveSoft);
    const deadline = Date.now() + perMove;

    // Profundidad adaptativa
    const n=board.length;
    let startD = this.baseDepth + (n<=7 ? 1 : 0);
    let maxD   = Math.min(this.maxDepth, startD+2);

    // Orden inicial
    const rootOrd = this.orderMoves(board, moves, this.ply, board);

    // Iterative deepening
    let bestMove = rootOrd[0], bestScore = -Infinity;
    for(let d=startD; d<=maxD; d++){
      if(Date.now()>=deadline) break;

      let localBest=bestScore, localMove=bestMove;
      const top = rootOrd.slice(0, Math.min(this.sampleCap, rootOrd.length));

      for(const [i,j,s] of top){
        const b2=this.clone(board);
        if(!this.ops.move(b2,i,j,s,this.ply)) continue;

        // α-β
        const res = this.search(b2, d-1, -Infinity, Infinity, false, deadline, board);
        if(res.cutoff) break;

        let val = res.score + ((i===0||j===0||i===b2.length-1||j===b2.length-1)? this.edgeBonus : 0);

        // Si el árbol es enorme y queda tiempo → refinar con unos rollouts
        if(Date.now()+15 < deadline && moves.length>90){
          let acc=0, k=Math.min(this.rollouts, 1+((deadline-Date.now())/40)|0);
          for(let r=0;r<k && Date.now()<deadline;r++) acc += this.rolloutEval(b2, this.opp, 20);
          val += acc / Math.max(1,k);
        }

        if(val>localBest){ localBest=val; localMove=[i,j,s]; }
      }

      if(Date.now()<deadline){ bestScore=localBest; bestMove=localMove; } else break;
    }

    // Fallback por seguridad
    if(!bestMove) bestMove = rootOrd[0] || moves[0];
    return bestMove;
  }
}
