/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   connection.ts                                      :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: m <m@student.42.fr>                        +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/10/20 01:45:00 by m                 #+#    #+#             */
/*   Updated: 2025/10/21 12:29:52 by m                ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import Database from 'better-sqlite3';
import * as fs from 'fs';
import * as path from 'path';

let db: Database.Database | null = null;

export function getDatabase(): Database.Database {
	if (!db) {
		const dbPath = process.env.DB_PATH ||
			path.join('../../db-data/transcendence.db');
		
		db = new Database(dbPath, {
			verbose: (sql) => {
				if (process.env.NODE_ENV === 'development') {
					console.log('[SQL]', sql);
				}
			}
		});
		db.pragma('journal_mode = WAL');
		db.pragma('foreign_keys = ON');
		
		const tablesSQL = fs.readFileSync(
			path.join(__dirname, 'schemas/tables.sql'),
			'utf-8');
		const indexesSQL = fs.readFileSync(
			path.join(__dirname, 'schemas/indexes.sql'),
			'utf-8');

		db.exec(tablesSQL);
		db.exec(indexesSQL);

		console.log('DB inicializada: ', dbPath, '\n[ ', __filename, ' ]');
	}
	
	return db;
}

export function closeDatabase(): void {
	if (db) {
		db.close();
		db = null;
		console.log('DB cerrada: ', __filename);
	}
}