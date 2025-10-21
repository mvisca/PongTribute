/* Indices para optimizar consultas frecuentes 
Permite hacer consultas como:
SELECT * WHERE number_of_players = 8
SELECT * WHEHE 1234 = ANY(users_ids)
SELECT * WHERE playoffs->>'status' = 'active'
Estos índices se deben revisitar al finalizar el proyecto para quitar o agregar los relacionados a las consulta más frecuentes
TODO: no es necesario para tables pequeñas, realizado aquí solo con fines de aprendizaje
 */

-- Búsqueda de usuarios
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_online ON users(is_online);

-- Búsqueda de amistades
CREATE INDEX IF NOT EXISTS idx_friendships_user ON friendships(user_id);
CREATE INDEX IF NOT EXISTS idx_friendships_friend ON friendships(friend_id);
CREATE INDEX IF NOT EXISTS idx_friendships_status ON friendships(status);

-- Historial de partidas
CREATE INDEX IF NOT EXISTS idx_match_participants_user ON match_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_matches_created ON matches(created_at);

-- Búsqueda de torneos
CREATE INDEX IF NOT EXISTS idx_tournaments_players ON tournaments(number_of_players);