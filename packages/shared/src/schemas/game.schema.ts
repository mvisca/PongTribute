/** NO LO VOY A USAR


// Este archivo es la Fuente de la Verdad. Define exactamente qué debe 
// enviar el Frontend para que el Backend acepte crear una partida.


// Importamos Type para construir el esquema de validación (runtime) 
// y Static para generar el tipo de TypeScript (compile-time).
import { Type, Static } from '@sinclair/typebox';

// Creamos un objeto JS real. Fastify usará esto para validar 
// el JSON entrante. Si el JSON no coincide, Fastify devolverá 
// error 400 automáticamente.
export const CreateGameSchema = Type.Object({
  gameMode: Type.Union([   //Union = "Uno de estos"
    Type.Literal('classic'), // Literal = "exactamente esto" , sino dara error
    Type.Literal('speed'),
    Type.Literal('retro')
  ]),
  visibility: Type.Union([
    Type.Literal('public'),
    Type.Literal('private')
  ]),
  opponentType: Type.Union([
    Type.Literal('human'),
    Type.Literal('ai')
  ]),
  targetScore: Type.Optional(Type.Number({ minimum: 1, maximum: 21, default: 11 })),
});

// Aquí convertimos el objeto de validación anterior en 
// un Tipo de TypeScript (interface).
// Así, en tu backend podrás usar CreateGameDto y TS sabrá 
// que gameMode es 'classic' | 'speed' | ... y te dará autocompletado.
export type CreateGameDto = Static<typeof CreateGameSchema>;
**/