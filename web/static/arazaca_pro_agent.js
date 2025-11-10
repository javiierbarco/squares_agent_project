/*
ArazacaProAgent v4
==================
Estrategia de apertura segura + control de cadenas + paridad final
Autor: Equipo Arazaca – UNAL 2025
*/

class ArazacaProAgent extends Agent {
  constructor(opts = {}) {
    super();
    this.ops = new Board();
    this.timeSlice = opts.timeSlice ?? 350;
    this.mmDepth = opts.mmDepth ?? 2;
  }

  init(color, board, time=20000){
    super.init(color, board, time);
    this.ply = color === "R" ? -1 : -2;
    this.opp = color === "R" ? -2 : -1;
  }

  clone(b){ return this.ops.clone(b); }
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
        const v=b[i][j]; if (v>=0 && this.bits(v)===3) n++;
      }
    return n;
  }

  evaluate(before, after){
    const myGain = this.countBoxes(after, this.ply) - this.countBoxes(before, this.ply);
    const oppGain = this.countBoxes(after, this.opp) - this.countBoxes(before, this.opp);
    const threeDiff = this.countThrees(after) - this.countThrees(before);
    return 1200*(myGain - oppGain) - 8*threeDiff;
  }

  minimax(board, depth, alpha, beta, maximizing, before){
    if (depth===0) return this.evaluate(before, board);
    const moves=this.ops.valid_moves(board);
    if (moves.length===0) return this.evaluate(before, board);

    if (maximizing){
      let best=-Infinity;
      for (const [i,j,s] of moves){
        const b2=this.clone(board);
        if (!this.ops.move(b2,i,j,s,this.ply)) continue;
        const val=this.minimax(b2, depth-1, alpha, beta, false, before);
        best=Math.max(best,val);
        alpha=Math.max(alpha,val);
        if (alpha>=beta) break;
      }
      return best;
    }else{
      let best=Infinity;
      for (const [i,j,s] of moves){
        const b2=this.clone(board);
        if (!this.ops.move(b2,i,j,s,this.opp)) continue;
        const val=this.minimax(b2, depth-1, alpha, beta, true, before);
        best=Math.min(best,val);
        beta=Math.min(beta,val);
        if (alpha>=beta) break;
      }
      return best;
    }
  }

  listSafeMoves(board){
    const moves=this.ops.valid_moves(board);
    const base3=this.countThrees(board);
    const res=[];
    for (const [i,j,s] of moves){
      const b2=this.clone(board);
      if (!this.ops.move(b2,i,j,s,this.ply)) continue;
      if (this.countThrees(b2)===base3) res.push([i,j,s]);
    }
    return res;
  }

  listClosingMoves(board){
    const moves=this.ops.valid_moves(board);
    const res=[];
    const before=this.countBoxes(board,this.ply);
    for (const [i,j,s] of moves){
      const b2=this.clone(board);
      if (!this.ops.move(b2,i,j,s,this.ply)) continue;
      const gain=this.countBoxes(b2,this.ply)-before;
      if (gain>0) res.push([i,j,s]);
    }
    return res;
  }

  // -------- lógica principal --------
  compute(board,time){
    const start=Date.now();
    const deadline=start+Math.min(this.timeSlice,Math.max(100,Math.floor((time||1000)*0.12)));

    const closers=this.listClosingMoves(board);
    if (closers.length>0) return closers[0];

    const safe=this.listSafeMoves(board);
    if (safe.length>0){
      let best=safe[0], bestV=-Infinity;
      const before=board;
      for (const [i,j,s] of safe){
        if (Date.now()>deadline) break;
        const b2=this.clone(board); this.ops.move(b2,i,j,s,this.ply);
        const val=this.minimax(b2,this.mmDepth-1,-Infinity,Infinity,false,before);
        const edge=(i===0||j===0||i===b2.length-1||j===b2.length-1)?0.4:0;
        const centerPenalty=Math.abs(i-b2.length/2)+Math.abs(j-b2.length/2);
        const score=val+edge-(centerPenalty*0.1);
        if (score>bestV){bestV=score;best=[i,j,s];}
      }
      return best;
    }

    // No hay seguras: apertura tardía o midgame.
    const all=this.ops.valid_moves(board);
    if (all.length===0) return [0,0,0];

    let best=all[0], bestV=-Infinity;
    const before=board;
    for (const [i,j,s] of all){
      if (Date.now()>deadline) break;
      const b2=this.clone(board); this.ops.move(b2,i,j,s,this.ply);
      const threeDiff=this.countThrees(b2)-this.countThrees(before);
      const val=this.minimax(b2,1,-Infinity,Infinity,false,before);
      const edge=(i===0||j===0||i===b2.length-1||j===b2.length-1)?0.2:0;
      const penalty=(threeDiff>0)?-4*threeDiff:0;
      const score=val+edge+penalty;
      if (score>bestV){bestV=score;best=[i,j,s];}
    }
    return best;
  }
}

// export
window.ArazacaProAgent = ArazacaProAgent;
