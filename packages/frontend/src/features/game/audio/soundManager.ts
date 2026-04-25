//soundManager.ts: expone 8 funciones de sonido + setMuted

// ─── Contexto compartido ──────────────────────────────────────────────────────
let ctx: AudioContext | null = null;
let _muted = false;

function getCtx(): AudioContext {
    if (!ctx) ctx = new AudioContext();
    // El navegador suspende el AudioContext hasta interacción del usuario
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
}

// ─── Helpers internos ─────────────────────────────────────────────────────────

// Crea un oscilador + gain, lo conecta y lo devuelve listo para usar
function makeOsc(
    frequency: number,
    type: OscillatorType,
    startVolume: number,
    startTime: number,
    endTime: number,
): void {
    if (_muted) return;
    const c = getCtx();
    const osc  = c.createOscillator();
    const gain = c.createGain();

    osc.type = type;
    osc.frequency.value = frequency;

    gain.gain.setValueAtTime(startVolume, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, endTime);

    osc.connect(gain);
    gain.connect(c.destination);
    osc.start(startTime);
    osc.stop(endTime);
}

// Secuencia de notas: [{freq, dur}] encadenadas en el tiempo
function playSequence(
    notes: { freq: number; dur: number; type?: OscillatorType; vol?: number }[],
    spacing = 0,  // gap opcional entre notas (segundos)
): void {
    if (_muted) return;
    const c = getCtx();
    let t = c.currentTime;
    for (const note of notes) {
        makeOsc(note.freq, note.type ?? 'square', note.vol ?? 0.3, t, t + note.dur);
        t += note.dur + spacing;
    }
}

// ─── API pública ──────────────────────────────────────────────────────────────

export const soundManager = {

    setMuted(value: boolean): void {
        _muted = value;
    },

    // Golpe de pala — click seco y corto
    paddleHit(): void {
        makeOsc(320, 'square', 0.4,
            getCtx().currentTime,
            getCtx().currentTime + 0.045
        );
    },

    // Rebote en pared — tono más grave y breve
    wallBounce(): void {
        makeOsc(180, 'sine', 0.25,
            getCtx().currentTime,
            getCtx().currentTime + 0.055
        );
    },

    // Punto anotado — bajada rápida (efecto "pum")
    score(): void {
        const c = getCtx();
        const t = c.currentTime;
        const osc  = c.createOscillator();
        const gain = c.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(800, t); //300
        osc.frequency.exponentialRampToValueAtTime(100, t + 0.4); //60 +0.25
        gain.gain.setValueAtTime(0.25, t); // 0.45
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4); // +0.25
        osc.connect(gain);
        gain.connect(c.destination);
        osc.start(t);
        osc.stop(t + 0.4); // 0.25
    },

    // Saque — tono ascendente breve (alerta de inicio de rally)
    serve(): void {
        const c = getCtx();
        const t = c.currentTime;
        const osc  = c.createOscillator();
        const gain = c.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(400, t);
        osc.frequency.exponentialRampToValueAtTime(800, t + 0.12);
        gain.gain.setValueAtTime(0.3, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
        osc.connect(gain);
        gain.connect(c.destination);
        osc.start(t);
        osc.stop(t + 0.12);
    },

    // Tick de countdown (3, 2, 1) — beep corto neutro
    countdownBeep(): void {
        makeOsc(880, 'sine', 0.3, // 600, 'square', 0.3
            getCtx().currentTime,
            getCtx().currentTime + 0.12
        );
    },

    // "GO!" — beep más largo y agudo al arrancar
    go(): void {
        makeOsc(1200, 'sine', 0.35, // 900, 'square', 0.4
            getCtx().currentTime,
            getCtx().currentTime + 0.35
        );
    },

    // Jingle victoria — secuencia ascendente festiva
    victory(): void {
        playSequence([
            { freq: 523, dur: 0.1 },   // C5
            { freq: 659, dur: 0.1 },   // E5
            { freq: 784, dur: 0.1 },   // G5
            { freq: 1047, dur: 0.35 }, // C6
        ], 0.02);
    },

    // Jingle derrota — secuencia descendente lenta
    defeat(): void {
        playSequence([
            { freq: 494, dur: 0.15, type: 'sawtooth' },  // B4
            { freq: 370, dur: 0.15, type: 'sawtooth' },  // F#4
            { freq: 294, dur: 0.4,  type: 'sawtooth' },  // D4
        ], 0.04);
    },

    // Notificación invitación recibida — dos pings
    matchInvite(): void {
        playSequence([
            { freq: 880, dur: 0.08, type: 'sine', vol: 0.35 },
            { freq: 1100, dur: 0.12, type: 'sine', vol: 0.35 },
        ], 0.06);
    },
};