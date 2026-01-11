import { Type, Static } from '@sinclair/typebox';



export namespace MatchSchemas {

    // ========================================================================
    // DEFINICIONES BÁSICAS
    // ========================================================================

    export const MatchStatus = Type.Union([
        Type.Literal("pending"),
        Type.Literal("active"),
		Type.Literal("finished"),
		Type.Literal("rejected")
    ]);

	
	export const MatchType = Type.Union([
		Type.Literal('public'),
		Type.Literal('private')
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

    // La Partida completa
    export const Match = Type.Object({
        id: Type.String({ format: 'uuid' }),
        status: MatchStatus,
        // Propiedades explícitas en lugar de Array (Más fácil para SQL)
        player1: MatchPlayer, 
        player2: Type.Optional(MatchPlayer), // Opcional: Al crear partida pública, P2 es null
        winnerId: Type.Union([Type.String({ format: 'uuid' }), Type.Null()]),
        createdAt: Type.String({ format: 'date-time' }),
		finishedAt: Type.Optional(Type.String({ format: 'date-time' })),
		gameMode: Type.Union([
            Type.Literal('classic'),
            Type.Literal('speed'),
            Type.Literal('retro')
        ]),
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
		gameMode: Type.Optional(Type.Union([
			Type.Literal('classic'),
			Type.Literal('speed'),
			Type.Literal('retro')
		], { default: 'classic' })),
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



	// POST /matches/id:/accept
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

	// POST /matches/id:/reject
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

	

}