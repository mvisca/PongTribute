# Friendship accept - repository guard

- Se valida la existencia previa de la amistad antes de actualizar (consulta canónica por IDs ordenados). Sin fila se lanza `SharedErrors.NotFoundError` con recurso `friendship`.
- Si el `UPDATE` no afecta filas también se lanza `NotFoundError` para evitar actualizaciones silenciosas.
- Tras el `UPDATE` se recupera la fila y se devuelve tipada; si no se recupera se lanza error genérico para no esconder inconsistencias.
- Se añadió helper `accept(userId, friendId, updatedAt?)` que reutiliza `update` con estado `accepted`, preservando `createdAt` y reutilizando `sortIds`.

