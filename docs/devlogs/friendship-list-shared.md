# Friendship list - shared contract

Contexto:
- Necesitamos exponer el contrato compartido para `GET /friendships`, incluyendo filtro opcional por `status`.
- El front debe poder reutilizar los enums/entidad compartidos para renderizar listas y estados.

Contrato HTTP (shared):
- Método/Path: `GET /friendships?status=<pending|accepted|rejected>`
- Auth: requerida (`bearerAuth`)
- Query: `status` opcional (`FriendshipSchemas.ListFriendshipsQuery`)
- Respuesta: `200` con `FriendshipSchemas.Friendship[]`

Notas:
- El enum reutiliza `FRIENDSHIP_STATUS` para garantizar consistencia.
- El type `ListFriendshipsQuery` mapea el esquema de query para tipar controladores/servicios.

