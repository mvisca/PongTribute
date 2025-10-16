/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   connection.ts                                      :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: m <m@student.42.fr>                        +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/10/15 18:13:31 by m                 #+#    #+#             */
/*   Updated: 2025/10/16 00:24:01 by m                ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

/**
 * Singleton que inicializa SQLite, ejecuta schemas, y exporta instancia db
 */

import BetterSqlite3 from 'better-sqlite3'; // Importr el driver de DB SQLite para JS
import { readFileSync } from 'fs';
import { join } from 'path';

const Database = BetterSqlite3 as any as {
	new (filename: string, options?: BetterSqlite3.Options): BetterSqlite3.Database;
};

let db: BetterSqlite3.Database | null = null;

/**
 * Obtiene o crea la DB, instancia única
 */
export function getDatabase(): BetterSqlite3.Database {
	if (!db) {
		// Ruta de la db
		const dbPath = process.env.DB_PATH || './transcendence.db';
		
		// Crea instancia singleton
		db = new Database(dbPath, {
			verbose: process.env.NODE_ENV === 'development' ? console.log : undefined
		});
		
		// Activar foreign keys
		db.pragma('foreign_keys = ON');
		
		// Ejecutar schemas
		initializeSchema(db);
	}

	return db;
}

/**
 * Ejecuta CREATE TABLE e indexes
 */
function initializeSchema(database: BetterSqlite3.Database): void {
	const tablesSQL = readFileSync(join(__dirname, 'schema/tables.sql'), 'utf-8');
	const indexesSQL = readFileSync(join(__dirname, 'schema/indexes.sql'), 'utf-8');

	database.exec(tablesSQL);
	database.exec(indexesSQL);
}

/**
 * Cierra la conexión (para test y shutdown)
 */
export function closeDatabase(): void {
	if (db) {
		db.close();
		db = null;
	}
}