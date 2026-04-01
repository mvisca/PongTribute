import React from 'react';

interface CountdownOverlayProps {
    count?: number;
}

export const CountdownOverlay: React.FC<CountdownOverlayProps> = ({ count }) => {
    // Si no hay cuenta (0 o undefined), no pintamos nada
    if (!count || count <= 0) return null;

	return (
		// pointer-events-none: Evita que este overlay intercepte los clics del ratón o los toques en la pantalla.
		// animate-pulse: efecto de "latido" al número para mayor impacto visual.
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm pointer-events-none">
            <span className="text-9xl font-extrabold text-white animate-pulse drop-shadow-2xl">
                {count}
            </span>
        </div>
    );
};