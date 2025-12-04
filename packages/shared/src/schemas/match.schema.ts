import { Type } from '@sinclair/typebox';

export namespace MatchSchemas {

    // ========================================================================
    // DEFINICIONES BÁSICAS
    // ========================================================================

    export const MatchStatus = Type.Union([
        Type.Literal("pending"),
        Type.Literal("active"),
        Type.Literal("finished")
    ]);

    // ========================================================================
    // OBJETOS DE DOMINIO (Entidades)
    // ========================================================================

    // Representa a un jugador dentro de la partida (simplificado para UI)
    export const MatchPlayer = Type.Object({
        userId: Type.String({ format: 'uuid' }),
        username: Type.String(),
        score: Type.Number({ default: 0 }),
        isWinner: Type.Boolean({ default: false }) // Útil para frontend
    });

    // La Partida completa
    export const Match = Type.Object({
        id: Type.String({ format: 'uuid' }),
        status: MatchStatus,
        // Propiedades explícitas en lugar de Array (Más fácil para SQL)
        player1: MatchPlayer, 
        player2: Type.Optional(MatchPlayer), // Opcional: Al crear partida pública, P2 es null
        winnerId: Type.Union([Type.String({ format: 'uuid' }), Type.Null()]),
        createdAt: Type.String({ format: 'date-time' }),
        finishedAt: Type.Optional(Type.String({ format: 'date-time' }))
    });

    // ========================================================================
    // DTOs (Inputs API)
    // ========================================================================

    // POST /matches - Crear una partida
    export const CreateMatchBody = Type.Object({
        opponentId: Type.Optional(Type.String({ format: 'uuid' })) // Si null -> Matchmaking público
    });

    // Schema para la ruta POST
    export const CreateMatchSchema = {
        description: 'Crea una partida nueva o entra al matchmaking',
        tags: ['Game'],
        body: CreateMatchBody,
        response: {
            201: Match
        }
    };

    // GET /matches/:id
    export const GetMatchParams = Type.Object({
        id: Type.String({ format: 'uuid' })
    });

    export const GetMatchSchema = {
        description: 'Obtiene el estado de una partida por ID',
        tags: ['Game'],
        params: GetMatchParams,
        response: {
            200: Match,
            404: Type.Object({ error: Type.String(), message: Type.String() })
        }
	};
	


	// Aquí irían más rutas:
    // app.get('/matches/:id', ...);

}