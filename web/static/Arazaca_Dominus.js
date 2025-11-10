/* arazaca_dominus_v2.js
   ArazacaDominus v2 – táctica primero, riesgo cero, y lookahead selectivo
   Autor: Equipo Arazaca – UNAL 2025
*/

class ArazacaDominusAgent extends Agent {
  constructor(opts = {}) {
    super();
    this.ops = new Board();

    // Ajustes (puedes afinar)
    this.baseDepth   = opts.baseDepth   ?? 2;
    this.maxDepth    = opts.maxDepth    ?? 4;     // corto y selectivo
    this.timeSlice   = opts.timeSlice   ?? 260;   // ms por jugada
    this.boxW        = opts.boxWeight   ?? 1200;
    this.threeW      = opts.threePenalty?? 10;
    this.twoW        = opts.twoBonus    ?? 10;
    this.edgeW       = opts.edgeBonus   ?? 0.2;

    this.tt = new Map();
  }

  init(color, board, time = 20000) {
    super.init(color, board, time);
    this.me  = color === "R" ? -1 : -2;
    this.opp = color === "R" ? -2 : -1;
    this.tt.clear();
  }

  // ==== utilidades rápidas ====
  clone(b){ return this.ops.clone(b); }
  bits(v){ return ((v&1)?1:0)+((v&2)?1:0)+((v&4)?1:0)+((v&8)?1:0); }

  countBoxes(b, who){
    let n=0;
    for(let i=0;i<b.length;i++)
      for(let j=0;j<b.length;j++) if(b[i][j]===who) n++;
    return n;
  }
  countThrees(b){
    let n=0;
    for(let i=0;i<b.length;i++)
      for(let j=0;j<b.length;j++){ const v=b[i][j]; if(v>=0 && this.bits(v)===3) n++; }
    return n;
  }
  countTwos(b){
    let n=0;
    for(let i=0;i<b.length;i++)
      for(let j=0;j<b.length;j++){ const v=b[i][j]; if(v>=0 && this.bits(v)===2) n++; }
    return n;
  }

  // hash canónico simple (simetrías básicas)
  key(b){
    const s0 = JSON.stringify(b);
    const r1 = JSON.stringify(b.map(row=>[...row].reverse()));
    const r2 = JSON.stringify([...b].reverse());
    const r3 = JSON.stringify([...b].reverse().map(row=>[...row].reverse()));
    return [s0,r1,r2,r3].sort()[0];
  }

  // ==== evaluación para este reglamento (sin turno extra) ====
  eval(before, after){
    const myG   = this.countBoxes(after,this.me)  - this.countBoxes(before,this.me);
    const opG   = this.countBoxes(after,this.opp) - this.countBoxes(before,this.opp);
    const d3    = this.countThrees(after) - this.countThrees(before);
    const twos  = this.countTwos(after);
    return this.boxW*(myG - opG) + this.twoW*twos - this.threeW*d3;
  }

  // ===== tácticas de raíz =====

  // 1) Lista de jugadas que capturan cajas ahora; las ordena por “menos riesgo” (3-lados)
  finishingMoves(board){
    const moves = this.ops.valid_moves(board);
    const out = [];
    const b0My = this.countBoxes(board,this.me);
    const th0  = this.countThrees(board);

    for(const [i,j,s] of moves){
      const b2 = this.clone(board);
      if(!this.ops.move(b2,i,j,s,this.me)) continue;
      const gained = this.countBoxes(b2,this.me) - b0My;
      if(gained>0){
        const risk = this.countThrees(b2) - th0;
        const edge = (i===0||j===0||i===b2.length-1||j===b2.length-1)? this.edgeW : 0;
        out.push({m:[i,j,s], risk, edge, score: this.eval(board,b2)+edge});
      }
    }
    // menor riesgo primero, luego mejor evaluación
    out.sort((a,b)=> (a.risk-b.risk) || (b.score-a.score));
    return out.map(x=>x.m);
  }

  // 2) Jugadas “seguras”: no aumentan 3-lados
  safeMoves(board){
    const moves = this.ops.valid_moves(board);
    const th0   = this.countThrees(board);
    const out   = [];
    for(const [i,j,s] of moves){
      const b2 = this.clone(board);
      if(!this.ops.move(b2,i,j,s,this.me)) continue;
      const d3 = this.countThrees(b2) - th0;
      if(d3<=0){ // permitir <=0 (si reduce, mejor)
        const edge = (i===0||j===0||i===b2.length-1||j===b2.length-1)? this.edgeW : 0;
        out.push({m:[i,j,s], score:this.eval(board,b2)+edge});
      }
    }
    // mejor score primero
    out.sort((a,b)=> b.score-a.score);
    return out.map(x=>x.m);
  }

  // Si no hay seguro, escoger el “menos malo”: minimiza 3-lados tras la jugada
  leastRisky(board){
    const moves = this.ops.valid_moves(board);
    const th0   = this.countThrees(board);
    let best = null, bestKey = [Infinity,-Infinity]; // [d3 asc, eval desc]
    for(const [i,j,s] of moves){
      const b2 = this.clone(board);
      if(!this.ops.move(b2,i,j,s,this.me)) continue;
      const d3   = this.countThrees(b2) - th0;
      const e    = this.eval(board,b2);
      const key  = [d3, e];
      if( (key[0]<bestKey[0]) || (key[0]===bestKey[0] && key[1]>bestKey[1]) ){
        bestKey = key; best = [i,j,s];
      }
    }
    return best || moves[0];
  }

  // ===== búsqueda selectiva (rápida) =====
  search(board, depth, alpha, beta, maximizing, deadline, rootBefore){
    if(Date.now() >= deadline) return this.eval(rootBefore, board);

    const code = maximizing? this.me : this.opp;
    const k = `${code}:${depth}:${this.key(board)}`;
    const c = this.tt.get(k);
    if(c!==undefined) return c;

    if(depth===0) {
      const v = this.eval(rootBefore, board);
      this.tt.set(k,v);
      return v;
    }

    const moves = this.ops.valid_moves(board);
    if(moves.length===0){
      const v = this.eval(rootBefore,board);
      this.tt.set(k,v);
      return v;
    }

    // Orden corto: prioriza capturas; si no, seguras; si no, todo
    let pool = [];
    const fin = this.orderAsObjects(board, moves, code, board, true);
    if(fin.length) pool = fin;
    else{
      const saf = this.orderAsObjects(board, moves, code, board, false);
      pool = saf.length ? saf : moves.map(m=>({m}));
    }

    if(maximizing){
      let best = -Infinity;
      for(const obj of pool){
        const [i,j,s] = obj.m;
        const b2 = this.clone(board);
        if(!this.ops.move(b2,i,j,s, code)) continue;
        const v = this.search(b2, depth-1, alpha, beta, !maximizing, deadline, rootBefore);
        if(v>best) best=v;
        if(best>alpha) alpha=best;
        if(alpha>=beta) break;
      }
      this.tt.set(k,best); return best;
    }else{
      let best = Infinity;
      for(const obj of pool){
        const [i,j,s] = obj.m;
        const b2 = this.clone(board);
        if(!this.ops.move(b2,i,j,s, code)) continue;
        const v = this.search(b2, depth-1, alpha, beta, !maximizing, deadline, rootBefore);
        if(v<best) best=v;
        if(best<beta) beta=best;
        if(alpha>=beta) break;
      }
      this.tt.set(k,best); return best;
    }
  }

  // crea objetos ordenados para la búsqueda
  orderAsObjects(board, moves, who, before, onlyFinishing){
    const th0  = this.countThrees(before);
    const b0Me = this.countBoxes(before, who);
    const arr  = [];
    for(const [i,j,s] of moves){
      const b2 = this.clone(board);
      if(!this.ops.move(b2,i,j,s, who)) continue;
      const gained = this.countBoxes(b2, who) - b0Me;
      if(onlyFinishing && gained<=0) continue;
      const d3  = this.countThrees(b2) - th0;
      const edge= (i===0||j===0||i===b2.length-1||j===b2.length-1)? this.edgeW:0;
      arr.push({m:[i,j,s], key: [ -gained, d3, -this.eval(board,b2)-edge ]});
    }
    // mejor: más cajas (gained grande => -gained pequeño), menos d3, mejor eval
    arr.sort((a,b)=>{
      for(let t=0;t<a.key.length;t++){
        if(a.key[t]!==b.key[t]) return a.key[t]-b.key[t];
      }
      return 0;
    });
    return arr;
  }

  // ===== decisión principal =====
  compute(board, time){
    const moves = this.ops.valid_moves(board);
    if(moves.length===0) return [0,0,0];

    // 1) Táctica inmediata
    const fins = this.finishingMoves(board);
    if(fins.length>0) return fins[0];

    const safes = this.safeMoves(board);
    if(safes.length>0){
      // mira un pelito (depth 2) entre las seguras para elegir la mejor
      const deadline = Date.now() + Math.min(this.timeSlice, Math.max(80, Math.floor((time||1000)*0.1)));
      let best = safes[0], bestV = -Infinity;
      for(const m of safes){
        if(Date.now()>=deadline) break;
        const [i,j,s]=m;
        const b2 = this.clone(board);
        if(!this.ops.move(b2,i,j,s,this.me)) continue;
        const v = this.search(b2, Math.min(this.maxDepth, this.baseDepth+1), -Infinity, Infinity, false, deadline, board);
        if(v>bestV){ bestV=v; best=m; }
      }
      return best;
    }

    // 2) Si no hay segura, busca el "menos malo" con un lookahead corto
    const risky = this.leastRisky(board);
    const deadline = Date.now() + Math.min(this.timeSlice, Math.max(80, Math.floor((time||1000)*0.1)));
    const [ri,rj,rs] = risky;
    const b2 = this.clone(board);
    if(!this.ops.move(b2,ri,rj,rs,this.me)) return risky;
    // una capa de búsqueda para confirmar
    this.initial = this.clone(board);
    this.search(b2, this.baseDepth, -Infinity, Infinity, false, deadline, board);
    return risky;
  }
}

// export global
window.ArazacaDominusAgent = ArazacaDominusAgent;
