// packages/shared/src/types/game.types.ts

// 1. Configuración del tablero (La "Cancha")
// El backend decide el tamaño lógico (ej: 800x600).
// El frontend escala esto al tamaño de la pantalla del usuario.
export interface GameConfig {
    width: number;        // Ancho total lógico
    height: number;       // Alto total lógico
    paddleWidth: number;
    paddleHeight: number;
    ballRadius: number;
}

// 2. Objetos del juego. La referencia al centro de la bola (BallState extiende de aqui)
export interface Coordinate {
    x: number;
    y: number;
}

export interface BallState extends Coordinate {
	dx: number;     // Velocidad X (para predicción en cliente)
	dy: number;     // Velocidad Y
}


export interface PaddleState {
    x: number;      // Necesario para dibujar (aunque sea fijo, el front debe saberlo)
    y: number;      // La variable que cambia
    score: number;
}


// 3. Estado completo de la partida (Snapshot)
export interface GameState {
    id: string;              // UUID de la partida (string, no number, por seguridad)
    player1: PaddleState;
    player2: PaddleState;
    ball: BallState;
	config: GameConfig;      // Enviamos las medidas para que el front sepa escalar
	targetScore: number;
    status: 'WAITING' | 'PLAYING' | 'PAUSED' | 'FINISHED' | 'ABORTED';
    winnerId?: number;       // ID del usuario ganador (si finished)
}

// 4. Inputs del Cliente (Lo que envía el usuario)
export interface GameInputPayload {
    gameId: string;
    action: 'MOVE_UP' | 'MOVE_DOWN' | 'STOP' | 'PAUSE_TOGGLE'; 
}