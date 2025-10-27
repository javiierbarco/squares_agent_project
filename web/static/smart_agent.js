/*
smart_agent.js
==============

Agente inteligente (SmartAgent - Equipo Arazaca) para el juego Cuadrito (Dots and Boxes).

Estrategia:
-----------
1️⃣ Prioriza cerrar cuadros (maximiza su puntuación)
2️⃣ Evita dejar casillas con 3 lados (riesgo de regalar punto)
3️⃣ Desempata prefiriendo movimientos en los bordes

Basado en la versión Python del equipo G1C.

Autor: Equipo Arazaca – UNAL
Fecha: 2025
*/

class SmartAgent extends Agent {
    constructor() {
        super();
        this.ops = new Board();  // Motor auxiliar para simular jugadas
        this.ply = null;         // código interno del jugador
        this.opp = null;         // código interno del oponente
    }

    init(color, board, time = 20000) {
        super.init(color, board, time);
        this.ply = (color === 'R') ? -1 : -2;
        this.opp = (color === 'R') ? -2 : -1;
    }

    // ----------------------------------------------------------------------
    // Funciones auxiliares de evaluación
    // ----------------------------------------------------------------------

    countColor(b, code) {
        let n = 0;
        for (let i = 0; i < b.length; i++) {
            for (let j = 0; j < b.length; j++) {
                if (b[i][j] === code) n++;
            }
        }
        return n;
    }

    countThreeSides(b) {
        // Cuenta casillas con exactamente 3 lados marcados
        let n = 0;
        for (let i = 0; i < b.length; i++) {
            for (let j = 0; j < b.length; j++) {
                const v = b[i][j];
                if (v >= 0) {
                    const bits = ((v & 1) ? 1 : 0) + ((v & 2) ? 1 : 0) + ((v & 4) ? 1 : 0) + ((v & 8) ? 1 : 0);
                    if (bits === 3) n++;
                }
            }
        }
        return n;
    }

    evaluate(before, after) {
        // Heurística: puntos propios - riesgo de tres lados
        const myGain = this.countColor(after, this.ply) - this.countColor(before, this.ply);
        const oppGain = this.countColor(after, this.opp) - this.countColor(before, this.opp);
        const gain = myGain - oppGain;

        const riskDelta = this.countThreeSides(after) - this.countThreeSides(before);

        return 1000 * gain - 5 * riskDelta;
    }

    // ----------------------------------------------------------------------
    // Método principal: decide el movimiento
    // ----------------------------------------------------------------------

    compute(board, time) {
        const moves = this.ops.valid_moves(board);
        if (moves.length === 0) return [0, 0, 0];

        let bestMove = moves[0];
        let bestScore = -Infinity;

        for (let k = 0; k < moves.length; k++) {
            const [i, j, s] = moves[k];
            const b2 = this.ops.clone(board);
            const ok = this.ops.move(b2, i, j, s, this.ply);
            if (!ok) continue;

            let score = this.evaluate(board, b2);

            // Pequeña bonificación si está en borde
            if (i === 0 || j === 0 || i === b2.length - 1 || j === b2.length - 1) score += 1;

            if (score > bestScore) {
                bestScore = score;
                bestMove = moves[k];
            }
        }

        return bestMove;
    }
}
