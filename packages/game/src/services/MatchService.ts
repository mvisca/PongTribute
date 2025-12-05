//Hace la funcion de cerebro. Contiene la logica
import { MatchRepository } from '../repositories/MatchRepository.js';
import { MatchMapper } from '../mappers/MatchMapper.js';
import { Utils, MatchTypes, generateMatchId } from '@transcendence/shared';

export class MatchService {
    // Instanciamos el repo para poder hablar con la DB
    private matchRepo = new MatchRepository();

    /**
     * Lógica principal de Matchmaking (FIFO):
     * 1. Busca si hay alguien esperando.
     * 2. Si hay, te une a su partida.
     * 3. Si no, crea una nueva y te pone a esperar.
     */
    async joinOrCreate(userId: string): Promise<MatchTypes.Match> {
        
		// PASO 1: Buscar partida pendiente
		// Pregunta al Repo: "¿Hay alguna partida 'pending' a la que le falte el player2?"
        // (Veremos el Repo en el siguiente paso, pero imagina que devuelve una fila de SQL o null)
        const pendingRow = this.matchRepo.findPendingPublicMatch();

        // PASO 2: Unirse a existente
        // Condición: Que exista Y que yo no sea el Player 1 (no jugar contra mí mismo)
        if (pendingRow && pendingRow.player1_id !== userId) {
            
		// --- RAMA 1: UNIRSE A PARTIDA EXISTENTE ---

            // a) Actualizamos la DB (poner mi ID en player2_id y cambiar status a 'active')
            this.matchRepo.joinMatch(pendingRow.id, userId);
            
            // b) Recuperamos la fila actualizada para devolver el estado real final
            const updatedRow = this.matchRepo.findById(pendingRow.id);
            
            if (!updatedRow) {
                throw new Error("Error crítico: La partida ha desaparecido tras unirse.");
            }

            // c) TRADUCCIÓN (mapper): Convertimos la fila de SQL a un objeto de API
            //El Mapper (MatchMapper): Es el traductor. La DB habla snake_case 
			// (player1_id), pero nuestro frontend espera camelCase (player1: { userId: ... }). El Mapper hace ese puente al final de cada rama.
			return MatchMapper.toDomain(updatedRow);
        }

		// --- RAMA 2: CREAR PARTIDA EXISTENTE ---

        // PASO 3: Crear nueva partida (si no había nadie esperando)
        const newMatchId = generateMatchId(); //genera un UUID
        const now = Date.now();

		// Preparamos los datos crudos para SQL (MatchRow)
		//creo un Literal Object newRow con los datos
		//Es la forma standard en TypeScript de preparar un objeto (DTO) para la BD
        const newRow: MatchTypes.MatchRow = {
            id: newMatchId,
            status: 'pending',  //Importante: nace esperando un rival
            
            // Player 1 (Yo)
            player1_id: userId,
            player1_score: 0,
            
            // Player 2 (Nadie aún)
            player2_id: null,
            player2_score: null,
            
            winner_id: null,
            created_at: now,
            finished_at: null
        };

		// Guardamos en DB
		//'create' pasa los datos del Literal Object a formato SQL y los injecta en la DB
        this.matchRepo.create(newRow);

        // Devolvemos un objeto limpio al cliente (que con el mapper hemos traducido desde una sentencia SQL)
        return MatchMapper.toDomain(newRow);
    }
}
