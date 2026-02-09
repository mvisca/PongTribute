// packages/frontend/src/pages/Game/LocalGame.tsx
import React, { useEffect, useRef } from 'react';
//import { GAME_CONSTANTS } from '@transcendence/shared/dist/constants/game.constants'
import { GAME_CONSTANTS } from '../../../../shared/src/constants/game.constants';

// Definimos estilos inline básicos para asegurar que se vea (luego lo pasamos a CSS)
const canvasStyle: React.CSSProperties = {
  background: '#000', // Fondo negro retro
  display: 'block',
  margin: '0 auto',   // Centrado
  border: '2px solid #FFF'
};

export const LocalGame = () => {
  // Referencia al elemento HTML <canvas>
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Obtenemos el contexto 2D (el pincel para dibujar)
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // --- FUNCIÓN DE DIBUJADO INICIAL (PRUEBA) ---
    const drawStaticBoard = () => {
      // 1. Limpiar el lienzo
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // 2. Pintar Pala Izquierda (Jugador 1)
      ctx.fillStyle = '#FFF'; // Color Blanco
      ctx.fillRect(
        GAME_CONSTANTS.WALL_MARGIN, 
        (GAME_CONSTANTS.CANVAS_HEIGHT / 2) - (GAME_CONSTANTS.PADDLE_HEIGHT / 2),
        GAME_CONSTANTS.PADDLE_WIDTH,
        GAME_CONSTANTS.PADDLE_HEIGHT
      );

      // 3. Pintar Pala Derecha (Jugador 2)
      ctx.fillRect(
        GAME_CONSTANTS.CANVAS_WIDTH - GAME_CONSTANTS.WALL_MARGIN - GAME_CONSTANTS.PADDLE_WIDTH, 
        (GAME_CONSTANTS.CANVAS_HEIGHT / 2) - (GAME_CONSTANTS.PADDLE_HEIGHT / 2),
        GAME_CONSTANTS.PADDLE_WIDTH,
        GAME_CONSTANTS.PADDLE_HEIGHT
      );

      // 4. Pintar Bola (Centro)
      ctx.beginPath();
      ctx.arc(
        GAME_CONSTANTS.CANVAS_WIDTH / 2,
        GAME_CONSTANTS.CANVAS_HEIGHT / 2,
        GAME_CONSTANTS.BALL_RADIUS,
        0,
        Math.PI * 2
      );
      ctx.fill();
      ctx.closePath();
    };

    drawStaticBoard();

  }, []); // El array vacío [] significa: "Ejecuta esto solo 1 vez al montar el componente"

  return (
    <div style={{ width: '100%', height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#222' }}>
      <h1 style={{ color: 'white', marginBottom: '20px' }}>Local Game (1 vs 1)</h1>
      
      {/* El Canvas usa las constantes de Shared para su tamaño lógico */}
      <canvas 
        ref={canvasRef}
        width={GAME_CONSTANTS.CANVAS_WIDTH}
        height={GAME_CONSTANTS.CANVAS_HEIGHT}
        style={canvasStyle}
      />
      
      <p style={{ color: '#AAA', marginTop: '10px' }}>
        P1: <b>W / S</b>  |  P2: <b>↑ / ↓</b>
      </p>
    </div>
  );
};