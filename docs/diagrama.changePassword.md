``` mermaid
sequenceDiagram
	Frontend->>Auth: PUT /auth/:id/password (old, new)
	Auth->>User: GET /internal/users/by-id
	User-->>Auth: { ...UserType.UserInternal, passwordHash }
	Auth->>Auth: bcrypt.compare(oldPassword, passwordHash)
	Auth->>Auth: bcrypt.hash(newPassword)
	Auth->>User: PUT /internal/users/:id/password (newHash)
	Auth-->>Frontend: 204 No Content
```