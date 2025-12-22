# Friendship list - API

Contexto:
- Exponer `GET /friendships?status=<pending|accepted|rejected>` protegido con JWT.
- Reutilizar el contrato compartido para tipar y documentar en Swagger (tag `Friendship`).

Qué se hizo:
- Se añadió el handler `listFriendships` en `FriendshipController`, leyendo `request.user.id` y la query opcional `status`.
- Se registró la ruta `GET /friendships` en `user.protectedRoutes` con `FriendshipSchemas.ListFriendshipsSchema`.

Cómo se hizo:
- Validación de autenticación previa (hook `AuthMiddleware.validateJWT` mantiene `request.user`).
- El handler delega en `FriendshipService.listFriendships` para aplicar el filtro por estado.

Pros / Contras:
- Pros: contrato único compartido, endpoint protegido y documentado bajo el tag correcto.
- Contras: sin paginación ni cacheo en la respuesta.

