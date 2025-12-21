# Friendship accept - shared contract

Context:
- We need a shared contract for the protected route that accepts a pending friendship.
- The contract should be minimal to avoid updating other fields from the client side.

HTTP contract (shared):
- Method/Path: `PATCH /friendships/:friendId`
- Auth: required (`bearerAuth`)
- Params: `friendId` (uuid) → `FriendshipSchemas.UpdateFriendshipParams`
- Body: `{ "accepted": boolean }` → `FriendshipSchemas.UpdateFriendshipBody` (aliased como `AcceptFriendship*` mientras se migra)
- Success: `200` with `FriendshipSchemas.Friendship`

Notes:
- The boolean flag se mapea a status `accepted` o `rejected` en la capa de servicio.
- Params and response reuse the shared UUID and entity shapes to keep backend and frontend aligned.

