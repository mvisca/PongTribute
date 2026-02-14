import { Type, Static } from '@sinclair/typebox';

// DEFINICION DEL ENUM (La única fuente de la verdad)
export enum GameMode {
	CLASSIC = 'classic',
	SPEED = 'speed',
	PRO = 'pro'
};

export namespace MatchSchemas {

    // ========================================================================
    // DEFINICIONES BÁSICAS
    // ========================================================================

    export const MatchStatus = Type.Union([
        Type.Literal("pending"),
        Type.Literal("active"),
		Type.Literal("finished"),
		Type.Literal("rejected"),
		Type.Literal("expired")
    ]);

	
	export const MatchType = Type.Union([
		Type.Literal('public'),
		Type.Literal('private'),
		Type.Literal('local')
	]);


	
    // ========================================================================
    // DEFINIMOS LOS OBJETOS DE DOMINIO (Entidades)
    // ========================================================================

    // Representa a un jugador dentro de la partida (simplificado para UI)
    export const MatchPlayer = Type.Object({
        userId: Type.String({ format: 'uuid' }),
        username: Type.String(),
        score: Type.Number({ default: 0 }),
        isWinner: Type.Boolean({ default: false }) // Útil para frontend
    });

    // La Partida completa (Objeto Match)
    export const Match = Type.Object({
        id: Type.String({ format: 'uuid' }),
        status: MatchStatus,
        // Propiedades explícitas en lugar de Array (Más fácil para SQL)
        player1: MatchPlayer, 
        player2: Type.Optional(MatchPlayer), // Opcional: Al crear partida pública, P2 es null
        winnerId: Type.Union([Type.String({ format: 'uuid' }), Type.Null()]),
        createdAt: Type.String({ format: 'date-time' }),
		finishedAt: Type.Optional(Type.String({ format: 'date-time' })),
		gameMode: Type.Enum(GameMode),
        targetScore: Type.Number()
    });

	// Esto actualiza automáticamente el tipo estático MatchTypes.Match
	export type Match = Static<typeof Match>;
	
    // ========================================================================
    // DTOs (Inputs API)
    // ========================================================================

    // POST /matches - Crear una partida
	export const CreateMatchBody = Type.Object({
		matchType: MatchType,
		opponentId: Type.Optional(Type.String({ format: 'uuid' })), // Si null -> Matchmaking público
		gameMode: Type.Optional(Type.Enum(GameMode, { default: GameMode.CLASSIC })),
		targetScore: Type.Optional(Type.Number({ minimum: 1, maximum: 21, default: 11 })),
    });

	// ESTA LÍNEA ES MÁGICA: Convierte el Schema de JS a un Tipo de TS
	export type CreateMatchBodyType = Static<typeof CreateMatchBody>;

	// Definimos la respuesta para "En cola"
    export const JoinQueueResponse = Type.Object({
        outcome: Type.Literal('added_to_queue')
	});
	
    // Schema para la ruta POST
    export const CreateMatchSchema = {
        description: 'Crea una partida nueva o entra al matchmaking',
        tags: ['Game'],
        body: CreateMatchBody,
        response: {
            201: Match,             // Si hay match -> Devuelve objeto Match
            200: JoinQueueResponse  // Si a la cola -> Devuelve outcome simple
        }
    };

    // GET /matches/:id
    export const GetMatchParams = Type.Object({
        id: Type.String({ format: 'uuid' })
    });

	// POST /matches/:id/accept
	export const AcceptMatchParams = Type.Object({
		id: Type.String({ format: 'uuid' })
	});

	export const AcceptMatchSchema = {
		description: 'Acepta una invitación a partida privada',
		tags: ['Game'],
		params: AcceptMatchParams,
		response: {
			200: Match,
			403: Type.Object({ error: Type.String(), message: Type.String() }),
			404: Type.Object({ error: Type.String(), message: Type.String() })
		}
	};

	// POST /matches/:id/reject
	export const RejectMatchParams = Type.Object({
		id: Type.String({ format: 'uuid' })
	});

	export const RejectMatchSchema = {
		description: 'Rechaza una invitación a partida privada',
		tags: ['Game'],
		params: RejectMatchParams,
		response: {
			200: Match,
			403: Type.Object({ error: Type.String(), message: Type.String() }),
			404: Type.Object({ error: Type.String(), message: Type.String() })
		}
	};

    export const GetMatchSchema = {
        description: 'Obtiene el estado de una partida por ID',
        tags: ['Game'],
        params: GetMatchParams,
        response: {
            200: Match,
            404: Type.Object({ error: Type.String(), message: Type.String() })
        }
	};
	
	// DELETE /matches/:id
	// El anfitrion cancela la invitacion antes de que el invitado la acepte o si nunca la acepta
    export const CancelMatchParams = Type.Object({
        id: Type.String({ format: 'uuid' })
    });

    export const CancelMatchResponse = Type.Object({
        success: Type.Boolean(),
        message: Type.String()
    });

    export const CancelMatchSchema = {
        description: 'Cancela una invitación a partida privada (solo creador)',
        tags: ['Game'],
        params: CancelMatchParams,
        response: {
            200: CancelMatchResponse,
            400: Type.Object({ error: Type.String(), message: Type.String() }),
            403: Type.Object({ error: Type.String(), message: Type.String() }),
            404: Type.Object({ error: Type.String(), message: Type.String() })
        }
	};
	
	// Definir el Schema del Response de abandonar/cancelar un usuario de una cola
	export const LeaveQueueResponseSchema = Type.Object({
		message: Type.String(),
		success: Type.Boolean()
	});
	
	// Esquema para los parámetros de la URL y Query String para obtener el History de partidas
	export const GetMatchHistorySchema = {
		description: 'Obtiene el historial de partidas de un usuario',
		params: Type.Object({
			userId: Type.String({ format: 'uuid' })
		}),
		querystring: Type.Object({
			// Solo permitimos offset para paginar (página 1, 2, 3...)
			offset: Type.Optional(Type.Number({ default: 0, minimum: 0 }))
		}),
		response: {
			200: Type.Array(Match)
		}
	};

	export type GetMatchHistoryReq = {
		Params: Static<typeof GetMatchHistorySchema.params>;
		Querystring: Static<typeof GetMatchHistorySchema.querystring>;
	};

}