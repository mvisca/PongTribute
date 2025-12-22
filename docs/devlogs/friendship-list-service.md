# Friendship list - servicio

Contexto:
- Implementar la lógica de servicio para `GET /friendships` con filtro opcional por `status`.

Qué se hizo:
- Se añadió `listFriendships(userId, { status? })` en `FriendshipService` reutilizando los métodos del repositorio existentes.
- Se validan los estados contra `FRIENDSHIP_STATUS`; si es inválido se lanza `SharedErrors.ValidationError`.

Cómo se hizo:
- Validación temprana de `status` con `Object.values(FRIENDSHIP_STATUS)`.
- Bifurcación: con `status` usa `findByUserAndStatus`, sin `status` usa `findByUser`.

Pros / Contras:
- Pros: lógica simple y reutilizable, sin duplicar queries.
- Contras: sin paginación ni caché; dos consultas separadas según el filtro.

