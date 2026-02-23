import { Type, Static } from '@sinclair/typebox';
import { ErrorSchemas } from './error.schema.js';
import { SchemaFields } from './fields.schema.js';
import { GameConstants } from '../constants/game.constants.js';
import { MatchConstants } from '../constants/match.constants.js';

const { UuidField, UsernameField, AvatarFieldUrl, DateTimeField, BooleanField } = SchemaFields;

export namespace MatchSchemas {
	
	// ========================================================================
	// DEFINICIONES BÁSICAS
	// ========================================================================
	
	export const MatchStatusSchema = Type.Union([
		Type.Literal(MatchConstants.MATCH_STATUS.PENDING),
		Type.Literal(MatchConstants.MATCH_STATUS.ACTIVE),
		Type.Literal(MatchConstants.MATCH_STATUS.FINISHED),
		Type.Literal(MatchConstants.MATCH_STATUS.REJECTED),
		Type.Literal(MatchConstants.MATCH_STATUS.EXPIRED)
	]);
	
	export const MatchTypeSchema = Type.Union([
		Type.Literal('public'),
		Type.Literal('private'),
		Type.Literal('local')
	]);
	
	export const GameModeSchema = Type.Union([
		Type.Literal(GameConstants.GAME_MODE.CLASSIC),
		Type.Literal(GameConstants.GAME_MODE.PRO),
		Type.Literal(GameConstants.GAME_MODE.SPEED)
	]);
	
	
	// ========================================================================
	// DEFINIMOS LOS OBJETOS DE DOMINIO (Entidades)
	// ========================================================================
	
	// Representa a un jugador dentro de la partida (simplificado para UI)
	export const MatchPlayerSchema = Type.Object({
		userId: UuidField,
		username: UsernameField,
		avatar: AvatarFieldUrl,
		score: Type.Number({ default: 0 }),
		isWinner: Type.Boolean({ default: false }) // Útil para frontend
	});

	// La Partida completa (Objeto Match)
	export const Match = Type.Object({
		id: UuidField,
		status: MatchStatusSchema,
		// Propiedades explícitas en lugar de Array (Más fácil para SQL)
		player1: MatchPlayerSchema,
		player2: Type.Optional(MatchPlayerSchema), // Opcional: Al crear partida pública, P2 es null
		winnerId: Type.Union([UuidField, Type.Null()]),
		createdAt: DateTimeField,
		finishedAt: Type.Optional(DateTimeField),
		gameMode:  GameModeSchema,
		targetScore: Type.Number()
	});
	
	// Esto actualiza automáticamente el tipo estático MatchTypes.Match
	export type Match = Static<typeof Match>;
	
	// ========================================================================
	// DTOs (Inputs API)
	// ========================================================================
	
	// POST /matches - Crear una partida
	export const CreateMatchBody = Type.Object({
		matchType: MatchTypeSchema,
		opponentId: Type.Optional(UuidField), // Si null -> Matchmaking público
		gameMode: GameModeSchema,
		targetScore: Type.Optional(Type.Integer({
			minimum: GameConstants.GAME_CONSTANTS.SCORE.MIN,
			maximum: GameConstants.GAME_CONSTANTS.SCORE.MAX,
			multipleOf: GameConstants.GAME_CONSTANTS.SCORE.STEP,
			default: GameConstants.GAME_CONSTANTS.SCORE.DEFAULT
		}))
	});
		
		// Convierte el Schema de JS a un Tipo de TS
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
			},
			security: [{ bearerAuth: [] }]
		};
		
		// GET /matches/:id
		export const GetMatchParams = Type.Object({
			id: UuidField
		});

		// POST /matches/:id/accept
		export const AcceptMatchParams = Type.Object({
			id: UuidField
		});
		
		export const AcceptMatchSchema = {
			description: 'Acepta una invitación a partida privada',
			tags: ['Game'],
			params: AcceptMatchParams,
			response: {
				200: Match,
				403: ErrorSchemas.Forbidden,
				404: ErrorSchemas.NotFound
			},
			security: [{ bearerAuth: [] }]
		};
		
		// POST /matches/:id/reject
		export const RejectMatchParams = Type.Object({
			id: UuidField
		});
		
		export const RejectMatchSchema = {
			description: 'Rechaza una invitación a partida privada',
			tags: ['Game'],
			params: RejectMatchParams,
			response: {
				200: Match,
				403: ErrorSchemas.Forbidden,
				404: ErrorSchemas.NotFound
			},
			security: [{ bearerAuth: [] }]
		};
		
		export const GetMatchSchema = {
			description: 'Obtiene el estado de una partida por ID',
			tags: ['Game'],
			params: GetMatchParams,
			response: {
				200: Match,
				404: ErrorSchemas.NotFound
			}
		};
		
		// DELETE /matches/:id
		// El anfitrion cancela la invitacion antes de que el invitado la acepte o si nunca la acepta
		export const CancelMatchParams = Type.Object({
			id: UuidField
		});

		export const CancelMatchResponse = Type.Object({
			success: BooleanField,
			message: Type.String()
		});
		
		export const CancelMatchSchema = {
			description: 'Cancela una invitación a partida privada (solo creador)',
			tags: ['Game'],
			params: CancelMatchParams,
			response: {
				200: CancelMatchResponse,
				400: ErrorSchemas.Validation,
				403: ErrorSchemas.Forbidden,
				404: ErrorSchemas.NotFound
			},
			security: [{ bearerAuth: [] }]
		};
		
		// Definir el Schema del Response de abandonar/cancelar un usuario de una cola
		export const LeaveQueueResponseSchema = Type.Object({
			message: Type.String(),
			success: BooleanField
		});
		
		export const LeaveQueueSchema = {
			description: 'Cancela la espera a una partida pública (abandona la cola)',
			tags: ['Game'],
			response: {
				200: LeaveQueueResponseSchema,
				401: ErrorSchemas.Unauthorized,
				404: ErrorSchemas.NotFound
			},
			security: [{ bearerAuth: [] }]
		};
		
		// Esquema para los parámetros de la URL y Query String para obtener el History de partidas
		export const GetMatchHistorySchema = {
			description: 'Obtiene el historial de partidas de un usuario',
			params: Type.Object({
				userId: UuidField
			}),
			querystring: Type.Object({
				// Solo permitimos offset para paginar (página 1, 2, 3...)
				offset: Type.Optional(Type.Number({ default: 0, minimum: 0 }))
			}),
			response: {
				200: Type.Object({ matches: Type.Array(Match) }),
				401: ErrorSchemas.Unauthorized
			},
			security: [{ bearerAuth: [] }]
		};
		
		export type GetMatchHistoryReq = {
			Params: Static<typeof GetMatchHistorySchema.params>;
			Querystring: Static<typeof GetMatchHistorySchema.querystring>;
		};
		
	}