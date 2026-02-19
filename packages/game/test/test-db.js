//Ejecutar este test desde directorio game con: npx tsx src/test-db.ts
import { getDatabase } from '../src/connection.js';
console.log('🧪 Probando conexión a DB...');
try {
    const db = getDatabase();
    // Consultar tablas existentes
    const tables = db.prepare(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name NOT LIKE 'sqlite_%'
    `).all();
    console.log('✅ Conexión exitosa.');
    console.log('📋 Tablas encontradas:', tables);
    if (tables.some((t) => t.name === 'matches') &&
        tables.some((t) => t.name === 'tournaments')) {
        console.log('🎉 ¡Estructura de Base de Datos CORRECTA!');
    }
    else {
        console.error('❌ FALTAN TABLAS. Revisa tus archivos .sql en /schemas');
    }
}
catch (error) {
    console.error('💥 Error fatal:', error);
}
