"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDatabase = getDatabase;
exports.closeDatabase = closeDatabase;
/**
 * Singleton que inicializa SQLite, ejecuta schemas, y exporta instancia db
 */
var better_sqlite3_1 = __importDefault(require("better-sqlite3")); // Importr el driver de DB SQLite para JS
var fs_1 = require("fs");
var path_1 = require("path");
var Database = better_sqlite3_1.default;
var db = null;
/**
 * Obtiene o crea la DB, instancia única
 */
function getDatabase() {
    if (!db) {
        // Ruta de la db
        var dbPath = process.env.DB_PATH || './transcendence.db';
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
function initializeSchema(database) {
    var tablesSQL = (0, fs_1.readFileSync)((0, path_1.join)(__dirname, 'schema/tables.sql'), 'utf-8');
    var indexesSQL = (0, fs_1.readFileSync)((0, path_1.join)(__dirname, 'schema/indexes.sql'), 'utf-8');
    database.exec(tablesSQL);
    database.exec(indexesSQL);
}
/**
 * Cierra la conexión (para test y shutdown)
 */
function closeDatabase() {
    if (db) {
        db.close();
        db = null;
    }
}
