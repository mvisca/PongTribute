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
        const pendingRow = this.matchRepo.findPendingPublicMatch();

        // PASO 2: Unirse a existente
        // Condición: Que exista Y que yo no sea el Player 1 (no jugar contra mí mismo)
        if (pendingRow && pendingRow.player1_id !== userId) {
            
            // a) Actualizamos la DB (poner mi ID en player2_id y cambiar status a 'active')
            this.matchRepo.joinMatch(pendingRow.id, userId);
            
            // b) Recuperamos la fila actualizada para devolver el estado real
            const updatedRow = this.matchRepo.findById(pendingRow.id);
            
            if (!updatedRow) {
                throw new Error("Error crítico: La partida ha desaparecido tras unirse.");
            }

            // c) TRADUCCIÓN: Convertimos la fila fea de SQL al objeto bonito de API
            return MatchMapper.toDomain(updatedRow);
        }

        // PASO 3: Crear nueva partida (si no había nadie esperando)
        const newMatchId = generateMatchId();
        const now = Date.now();

        // Preparamos los datos crudos para SQL (MatchRow)
        const newRow: MatchTypes.MatchRow = {
            id: newMatchId,
            status: 'pending',
            
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
        this.matchRepo.create(newRow);

        // Devolvemos el objeto traducido
        return MatchMapper.toDomain(newRow);
    }
}
