{
  "info": {
    "name": "ft_transcendence API",
    "description": "Colección completa de endpoints para el proyecto ft_transcendence\n\n**Base URL:** http://localhost:3000 (API Gateway)\n\n**Servicios:**\n- AUTH: Puerto 3002\n- USER: Puerto 3001\n- GAME: Puerto 3003\n\n**Variables de entorno necesarias:**\n- baseUrl: http://localhost:3000\n- token: (se guarda automáticamente)\n- userId: (se guarda automáticamente)\n- friendId: (configurar manualmente para tests de amistad)\n- matchId: (se guarda automáticamente)",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
    "_exporter_id": "transcendence"
  },
  "item": [
    {
      "name": "AUTH Service",
      "item": [
        {
          "name": "Public",
          "item": [
            {
              "name": "Register User",
              "event": [
                {
                  "listen": "test",
                  "script": {
                    "exec": [
                      "if (pm.response.code === 201) {",
                      "    const jsonData = pm.response.json();",
                      "    pm.environment.set(\"token\", jsonData.token);",
                      "    pm.environment.set(\"userId\", jsonData.user.id);",
                      "    pm.environment.set(\"refreshToken\", jsonData.refreshToken);",
                      "    console.log(\"✅ Token guardado:\", jsonData.token.substring(0, 20) + \"...\");",
                      "    console.log(\"✅ User ID guardado:\", jsonData.user.id);",
                      "}"
                    ],
                    "type": "text/javascript"
                  }
                }
              ],
              "request": {
                "method": "POST",
                "header": [
                  {
                    "key": "Content-Type",
                    "value": "application/json"
                  }
                ],
                "body": {
                  "mode": "raw",
                  "raw": "{\n  \"username\": \"testuser\",\n  \"email\": \"test@example.com\",\n  \"password\": \"Password123!\",\n  \"avatar\": \"https://i.pravatar.cc/150?u=testuser\"\n}"
                },
                "url": {
                  "raw": "{{baseUrl}}/api/auth/register",
                  "host": ["{{baseUrl}}"],
                  "path": ["api", "auth", "register"]
                },
                "description": "Registra un nuevo usuario en el sistema.\n\n**Response 201:**\n```json\n{\n  \"token\": \"eyJhbGc...\",\n  \"refreshToken\": \"eyJhbGc...\",\n  \"user\": {\n    \"id\": \"uuid\",\n    \"username\": \"testuser\",\n    \"email\": \"test@example.com\",\n    \"avatar\": \"https://...\",\n    \"isOnline\": true\n  }\n}\n```\n\n**Guarda automáticamente:** token, userId, refreshToken"
              },
              "response": []
            },
            {
              "name": "Login",
              "event": [
                {
                  "listen": "test",
                  "script": {
                    "exec": [
                      "if (pm.response.code === 200) {",
                      "    const jsonData = pm.response.json();",
                      "    if (jsonData.token) {",
                      "        pm.environment.set(\"token\", jsonData.token);",
                      "        pm.environment.set(\"refreshToken\", jsonData.refreshToken);",
                      "        console.log(\"✅ Login exitoso sin 2FA\");",
                      "    }",
                      "}",
                      "if (pm.response.code === 202) {",
                      "    const jsonData = pm.response.json();",
                      "    pm.environment.set(\"provisionalToken\", jsonData.provisionalToken);",
                      "    console.log(\"⚠️ 2FA requerido. Usar endpoint verify-2fa\");",
                      "}"
                    ],
                    "type": "text/javascript"
                  }
                }
              ],
              "request": {
                "method": "POST",
                "header": [
                  {
                    "key": "Content-Type",
                    "value": "application/json"
                  }
                ],
                "body": {
                  "mode": "raw",
                  "raw": "{\n  \"email\": \"test@example.com\",\n  \"password\": \"Password123!\"\n}"
                },
                "url": {
                  "raw": "{{baseUrl}}/api/auth/login",
                  "host": ["{{baseUrl}}"],
                  "path": ["api", "auth", "login"]
                },
                "description": "Autentica un usuario existente.\n\n**Response 200 (sin 2FA):**\n```json\n{\n  \"token\": \"eyJhbGc...\",\n  \"refreshToken\": \"eyJhbGc...\",\n  \"user\": {...}\n}\n```\n\n**Response 202 (con 2FA):**\n```json\n{\n  \"twoFactorRequired\": true,\n  \"userId\": \"uuid\",\n  \"provisionalToken\": \"eyJhbGc...\",\n  \"expiresIn\": 120\n}\n```"
              },
              "response": []
            },
            {
              "name": "Verify 2FA (Login)",
              "event": [
                {
                  "listen": "test",
                  "script": {
                    "exec": [
                      "if (pm.response.code === 200) {",
                      "    const jsonData = pm.response.json();",
                      "    pm.environment.set(\"token\", jsonData.token);",
                      "    pm.environment.set(\"refreshToken\", jsonData.refreshToken);",
                      "    console.log(\"✅ 2FA verificado, login completo\");",
                      "}"
                    ],
                    "type": "text/javascript"
                  }
                }
              ],
              "request": {
                "method": "POST",
                "header": [
                  {
                    "key": "Content-Type",
                    "value": "application/json"
                  }
                ],
                "body": {
                  "mode": "raw",
                  "raw": "{\n  \"provisionalToken\": \"{{provisionalToken}}\",\n  \"totpCode\": \"123456\"\n}"
                },
                "url": {
                  "raw": "{{baseUrl}}/api/auth/verify-2fa",
                  "host": ["{{baseUrl}}"],
                  "path": ["api", "auth", "verify-2fa"]
                },
                "description": "Completa el login cuando el usuario tiene 2FA activado.\n\n**Requiere:** provisionalToken (del login con 2FA)\n\n**TOTP Code:** Obtener de Google Authenticator o similar"
              },
              "response": []
            },
            {
              "name": "Verify Backup Code (Recovery)",
              "event": [
                {
                  "listen": "test",
                  "script": {
                    "exec": [
                      "if (pm.response.code === 200) {",
                      "    const jsonData = pm.response.json();",
                      "    pm.environment.set(\"token\", jsonData.token);",
                      "    pm.environment.set(\"refreshToken\", jsonData.refreshToken);",
                      "    console.log(\"✅ Backup code verificado. 2FA desactivado automáticamente.\");",
                      "}"
                    ],
                    "type": "text/javascript"
                  }
                }
              ],
              "request": {
                "method": "POST",
                "header": [
                  {
                    "key": "Content-Type",
                    "value": "application/json"
                  }
                ],
                "body": {
                  "mode": "raw",
                  "raw": "{\n  \"provisionalToken\": \"{{provisionalToken}}\",\n  \"backupCode\": \"ABCD-1234\"\n}"
                },
                "url": {
                  "raw": "{{baseUrl}}/api/auth/verify-backup-code",
                  "host": ["{{baseUrl}}"],
                  "path": ["api", "auth", "verify-backup-code"]
                },
                "description": "Método de recuperación cuando el usuario pierde acceso a su TOTP.\n\n**⚠️ IMPORTANTE:** Al usar el backup code, 2FA se desactiva automáticamente."
              },
              "response": []
            }
          ]
        },
        {
          "name": "Protected (JWT)",
          "item": [
            {
              "name": "Logout",
              "request": {
                "method": "POST",
                "header": [
                  {
                    "key": "Authorization",
                    "value": "Bearer {{token}}"
                  }
                ],
                "url": {
                  "raw": "{{baseUrl}}/api/auth/logout",
                  "host": ["{{baseUrl}}"],
                  "path": ["api", "auth", "logout"]
                },
                "description": "Cierra la sesión del usuario y elimina todos sus refresh tokens.\n\n**Response 204:** No Content"
              },
              "response": []
            }
          ]
        },
        {
          "name": "Protected (JWT + Ownership)",
          "item": [
            {
              "name": "Enable 2FA",
              "event": [
                {
                  "listen": "test",
                  "script": {
                    "exec": [
                      "if (pm.response.code === 200) {",
                      "    const jsonData = pm.response.json();",
                      "    pm.environment.set(\"setupToken\", jsonData.setupToken);",
                      "    pm.environment.set(\"backupCode\", jsonData.backupCode);",
                      "    console.log(\"✅ Setup Token guardado:\", jsonData.setupToken.substring(0, 20) + \"...\");",
                      "    console.log(\"⚠️ BACKUP CODE (guardar en lugar seguro):\", jsonData.backupCode);",
                      "    console.log(\"📱 Escanear QR con Google Authenticator\");",
                      "}"
                    ],
                    "type": "text/javascript"
                  }
                }
              ],
              "request": {
                "method": "POST",
                "header": [
                  {
                    "key": "Authorization",
                    "value": "Bearer {{token}}"
                  }
                ],
                "url": {
                  "raw": "{{baseUrl}}/api/auth/{{userId}}/enable-2fa",
                  "host": ["{{baseUrl}}"],
                  "path": ["api", "auth", "{{userId}}", "enable-2fa"]
                },
                "description": "Inicia el proceso de activación de 2FA.\n\n**Response 200:**\n```json\n{\n  \"setupToken\": \"hex-64-chars\",\n  \"backupCode\": \"ABCD-1234\",\n  \"qr\": \"data:image/png;base64,...\"\n}\n```\n\n**IMPORTANTE:**\n1. Guardar el backupCode en lugar seguro\n2. Escanear QR con Google Authenticator\n3. Usar el código TOTP en verify-2fa-setup"
              },
              "response": []
            },
            {
              "name": "Verify 2FA Setup",
              "request": {
                "method": "POST",
                "header": [
                  {
                    "key": "Authorization",
                    "value": "Bearer {{token}}"
                  },
                  {
                    "key": "Content-Type",
                    "value": "application/json"
                  }
                ],
                "body": {
                  "mode": "raw",
                  "raw": "{\n  \"setupToken\": \"{{setupToken}}\",\n  \"totpCode\": \"123456\"\n}"
                },
                "url": {
                  "raw": "{{baseUrl}}/api/auth/{{userId}}/verify-2fa-setup",
                  "host": ["{{baseUrl}}"],
                  "path": ["api", "auth", "{{userId}}", "verify-2fa-setup"]
                },
                "description": "Completa la activación de 2FA verificando el código TOTP.\n\n**Máximo 3 intentos** (rate limiting implementado)\n\n**Response 204:** No Content (2FA activado exitosamente)"
              },
              "response": []
            },
            {
              "name": "Disable 2FA",
              "request": {
                "method": "POST",
                "header": [
                  {
                    "key": "Authorization",
                    "value": "Bearer {{token}}"
                  },
                  {
                    "key": "Content-Type",
                    "value": "application/json"
                  }
                ],
                "body": {
                  "mode": "raw",
                  "raw": "{\n  \"password\": \"Password123!\"\n}"
                },
                "url": {
                  "raw": "{{baseUrl}}/api/auth/{{userId}}/disable-2fa",
                  "host": ["{{baseUrl}}"],
                  "path": ["api", "auth", "{{userId}}", "disable-2fa"]
                },
                "description": "Desactiva 2FA para el usuario autenticado.\n\n**Requiere:** Contraseña actual para confirmar\n\n**Response 204:** No Content"
              },
              "response": []
            },
            {
              "name": "Change Password",
              "request": {
                "method": "POST",
                "header": [
                  {
                    "key": "Authorization",
                    "value": "Bearer {{token}}"
                  },
                  {
                    "key": "Content-Type",
                    "value": "application/json"
                  }
                ],
                "body": {
                  "mode": "raw",
                  "raw": "{\n  \"oldPassword\": \"Password123!\",\n  \"newPassword\": \"NewPassword456!\"\n}"
                },
                "url": {
                  "raw": "{{baseUrl}}/api/auth/{{userId}}/update-password",
                  "host": ["{{baseUrl}}"],
                  "path": ["api", "auth", "{{userId}}", "update-password"]
                },
                "description": "Cambia la contraseña del usuario.\n\n**Validaciones:**\n- oldPassword debe ser correcta\n- newPassword: mínimo 8 caracteres, 1 letra, 1 número\n\n**Response 204:** No Content"
              },
              "response": []
            }
          ]
        }
      ]
    },
    {
      "name": "USER Service",
      "item": [
        {
          "name": "Public",
          "item": [
            {
              "name": "Check Username Availability",
              "request": {
                "method": "GET",
                "header": [],
                "url": {
                  "raw": "{{baseUrl}}/api/users/check-username/testuser",
                  "host": ["{{baseUrl}}"],
                  "path": ["api", "users", "check-username", "testuser"]
                },
                "description": "Verifica si un nombre de usuario está disponible.\n\n**Response 200:**\n```json\n{\n  \"available\": false,\n  \"username\": \"testuser\"\n}\n```"
              },
              "response": []
            },
            {
              "name": "Check Email Availability",
              "request": {
                "method": "GET",
                "header": [],
                "url": {
                  "raw": "{{baseUrl}}/api/users/check-email/test@example.com",
                  "host": ["{{baseUrl}}"],
                  "path": ["api", "users", "check-email", "test@example.com"]
                },
                "description": "Verifica si un email está disponible.\n\n**Response 200:**\n```json\n{\n  \"available\": false,\n  \"email\": \"test@example.com\"\n}\n```"
              },
              "response": []
            }
          ]
        },
        {
          "name": "Protected (JWT)",
          "item": [
            {
              "name": "Get User by ID",
              "request": {
                "method": "GET",
                "header": [
                  {
                    "key": "Authorization",
                    "value": "Bearer {{token}}"
                  }
                ],
                "url": {
                  "raw": "{{baseUrl}}/api/users/{{userId}}",
                  "host": ["{{baseUrl}}"],
                  "path": ["api", "users", "{{userId}}"]
                },
                "description": "Obtiene información pública de un usuario por su ID.\n\n**Response 200:**\n```json\n{\n  \"id\": \"uuid\",\n  \"username\": \"testuser\",\n  \"email\": \"test@example.com\",\n  \"avatar\": \"https://...\",\n  \"isOnline\": true,\n  \"createdAt\": \"2024-01-01T00:00:00Z\",\n  \"updatedAt\": \"2024-01-01T00:00:00Z\"\n}\n```"
              },
              "response": []
            },
            {
              "name": "Get User by Username",
              "request": {
                "method": "GET",
                "header": [
                  {
                    "key": "Authorization",
                    "value": "Bearer {{token}}"
                  }
                ],
                "url": {
                  "raw": "{{baseUrl}}/api/users/username/testuser",
                  "host": ["{{baseUrl}}"],
                  "path": ["api", "users", "username", "testuser"]
                },
                "description": "Obtiene información pública de un usuario por su username."
              },
              "response": []
            },
            {
              "name": "Get User by Email",
              "request": {
                "method": "GET",
                "header": [
                  {
                    "key": "Authorization",
                    "value": "Bearer {{token}}"
                  }
                ],
                "url": {
                  "raw": "{{baseUrl}}/api/users/email/test@example.com",
                  "host": ["{{baseUrl}}"],
                  "path": ["api", "users", "email", "test@example.com"]
                },
                "description": "Obtiene información pública de un usuario por su email."
              },
              "response": []
            }
          ]
        },
        {
          "name": "Protected (JWT + Ownership)",
          "item": [
            {
              "name": "Update User",
              "request": {
                "method": "PUT",
                "header": [
                  {
                    "key": "Authorization",
                    "value": "Bearer {{token}}"
                  },
                  {
                    "key": "Content-Type",
                    "value": "application/json"
                  }
                ],
                "body": {
                  "mode": "raw",
                  "raw": "{\n  \"username\": \"newusername\",\n  \"email\": \"newemail@example.com\",\n  \"avatar\": \"https://new-avatar-url.com/image.png\"\n}"
                },
                "url": {
                  "raw": "{{baseUrl}}/api/users/{{userId}}",
                  "host": ["{{baseUrl}}"],
                  "path": ["api", "users", "{{userId}}"]
                },
                "description": "Actualiza información del usuario.\n\n**Todos los campos son opcionales** (actualización parcial)\n\n**Response 200:** UserPublic actualizado"
              },
              "response": []
            },
            {
              "name": "Anonymize User (GDPR)",
              "request": {
                "method": "PUT",
                "header": [
                  {
                    "key": "Authorization",
                    "value": "Bearer {{token}}"
                  }
                ],
                "url": {
                  "raw": "{{baseUrl}}/api/users/{{userId}}/anonymize",
                  "host": ["{{baseUrl}}"],
                  "path": ["api", "users", "{{userId}}", "anonymize"]
                },
                "description": "Anonimiza los datos del usuario (GDPR compliance).\n\n**Acción irreversible**\n\n**Response 204:** No Content"
              },
              "response": []
            },
            {
              "name": "Delete User (Soft Delete)",
              "request": {
                "method": "DELETE",
                "header": [
                  {
                    "key": "Authorization",
                    "value": "Bearer {{token}}"
                  }
                ],
                "url": {
                  "raw": "{{baseUrl}}/api/users/{{userId}}",
                  "host": ["{{baseUrl}}"],
                  "path": ["api", "users", "{{userId}}"]
                },
                "description": "Elimina el usuario (soft delete: is_deleted=1).\n\n**Response 204:** No Content"
              },
              "response": []
            }
          ]
        }
      ]
    },
    {
      "name": "FRIENDSHIP (USER Service)",
      "item": [
        {
          "name": "List My Friendships",
          "request": {
            "method": "GET",
            "header": [
              {
                "key": "Authorization",
                "value": "Bearer {{token}}"
              }
            ],
            "url": {
              "raw": "{{baseUrl}}/api/friendships?status=pending",
              "host": ["{{baseUrl}}"],
              "path": ["api", "friendships"],
              "query": [
                {
                  "key": "status",
                  "value": "pending",
                  "description": "Opcional: pending | accepted | rejected"
                }
              ]
            },
            "description": "Lista todas las amistades del usuario autenticado.\n\n**Query Params (opcional):**\n- status: pending | accepted | rejected\n\n**Response 200:**\n```json\n[\n  {\n    \"userId\": \"uuid-sorted-1\",\n    \"friendId\": \"uuid-sorted-2\",\n    \"initiatorId\": \"uuid-quien-envio\",\n    \"status\": \"pending\",\n    \"createdAt\": \"2024-01-01T00:00:00Z\",\n    \"updatedAt\": \"2024-01-01T00:00:00Z\"\n  }\n]\n```"
          },
          "response": []
        },
        {
          "name": "Create Friendship Request",
          "event": [
            {
              "listen": "test",
              "script": {
                "exec": [
                  "if (pm.response.code === 201) {",
                  "    console.log(\"✅ Solicitud de amistad enviada\");",
                  "}"
                ],
                "type": "text/javascript"
              }
            }
          ],
          "request": {
            "method": "POST",
            "header": [
              {
                "key": "Authorization",
                "value": "Bearer {{token}}"
              },
              {
                "key": "Content-Type",
                "value": "application/json"
              }
            ],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"friendId\": \"{{friendId}}\"\n}"
            },
            "url": {
              "raw": "{{baseUrl}}/api/friendships",
              "host": ["{{baseUrl}}"],
              "path": ["api", "friendships"]
            },
            "description": "Crea una solicitud de amistad.\n\n**Validaciones:**\n- No puedes enviarte solicitud a ti mismo\n- No puedes duplicar solicitudes existentes\n\n**Response 201:**\n```json\n{\n  \"userId\": \"uuid-sorted\",\n  \"friendId\": \"uuid-sorted\",\n  \"initiatorId\": \"your-uuid\",\n  \"status\": \"pending\",\n  \"createdAt\": \"2024-01-01T00:00:00Z\",\n  \"updatedAt\": \"2024-01-01T00:00:00Z\"\n}\n```\n\n**NOTA:** userId y friendId se ordenan lexicográficamente (orden canónico)"
          },
          "response": []
        },
        {
          "name": "Accept Friendship",
          "request": {
            "method": "PATCH",
            "header": [
              {
                "key": "Authorization",
                "value": "Bearer {{token}}"
              },
              {
                "key": "Content-Type",
                "value": "application/json"
              }
            ],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"accepted\": true\n}"
            },
            "url": {
              "raw": "{{baseUrl}}/api/friendships/{{friendId}}",
              "host": ["{{baseUrl}}"],
              "path": ["api", "friendships", "{{friendId}}"]
            },
            "description": "Acepta una solicitud de amistad pendiente.\n\n**Solo el receptor** puede aceptar/rechazar.\n\n**Response 200:**\n```json\n{\n  \"userId\": \"uuid\",\n  \"friendId\": \"uuid\",\n  \"initiatorId\": \"uuid\",\n  \"status\": \"accepted\",\n  \"updatedAt\": \"2024-01-02T10:00:00Z\"\n}\n```"
          },
          "response": []
        },
        {
          "name": "Reject Friendship",
          "request": {
            "method": "PATCH",
            "header": [
              {
                "key": "Authorization",
                "value": "Bearer {{token}}"
              },
              {
                "key": "Content-Type",
                "value": "application/json"
              }
            ],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"accepted\": false\n}"
            },
            "url": {
              "raw": "{{baseUrl}}/api/friendships/{{friendId}}",
              "host": ["{{baseUrl}}"],
              "path": ["api", "friendships", "{{friendId}}"]
            },
            "description": "Rechaza una solicitud de amistad pendiente.\n\n**Solo el receptor** puede aceptar/rechazar.\n\n**Response 200:**\n```json\n{\n  \"userId\": \"uuid\",\n  \"friendId\": \"uuid\",\n  \"initiatorId\": \"uuid\",\n  \"status\": \"rejected\",\n  \"updatedAt\": \"2024-01-02T10:00:00Z\"\n}\n```"
          },
          "response": []
        }
      ]
    },
    {
      "name": "GAME Service",
      "item": [
        {
          "name": "Create Match (Public Matchmaking)",
          "event": [
            {
              "listen": "test",
              "script": {
                "exec": [
                  "if (pm.response.code === 201) {",
                  "    const jsonData = pm.response.json();",
                  "    pm.environment.set(\"matchId\", jsonData.id);",
                  "    console.log(\"✅ Match encontrado! ID guardado:\", jsonData.id);",
                  "} else if (pm.response.code === 200) {",
                  "    console.log(\"⏳ Agregado a la cola de matchmaking\");",
                  "}"
                ],
                "type": "text/javascript"
              }
            }
          ],
          "request": {
            "method": "POST",
            "header": [
              {
                "key": "Authorization",
                "value": "Bearer {{token}}"
              },
              {
                "key": "Content-Type",
                "value": "application/json"
              }
            ],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"matchType\": \"public\"\n}"
            },
            "url": {
              "raw": "{{baseUrl}}/api/matches",
              "host": ["{{baseUrl}}"],
              "path": ["api", "matches"]
            },
            "description": "Crea una partida pública (matchmaking automático).\n\n**Response 200 (en cola):**\n```json\n{\n  \"outcome\": \"added_to_queue\"\n}\n```\n\n**Response 201 (match encontrado):**\n```json\n{\n  \"id\": \"match-uuid\",\n  \"matchType\": \"public\",\n  \"status\": \"pending\",\n  \"player1\": {\n    \"userId\": \"uuid\",\n    \"username\": \"player1\",\n    \"score\": 0\n  },\n  \"player2\": {\n    \"userId\": \"uuid\",\n    \"username\": \"player2\",\n    \"score\": 0\n  },\n  \"createdAt\": \"2024-01-01T00:00:00Z\"\n}\n```"
          },
          "response": []
        },
        {
          "name": "Create Match (Private Challenge)",
          "event": [
            {
              "listen": "test",
              "script": {
                "exec": [
                  "if (pm.response.code === 201) {",
                  "    const jsonData = pm.response.json();",
                  "    pm.environment.set(\"matchId\", jsonData.id);",
                  "    console.log(\"✅ Desafío creado! ID guardado:\", jsonData.id);",
                  "}"
                ],
                "type": "text/javascript"
              }
            }
          ],
          "request": {
            "method": "POST",
            "header": [
              {
                "key": "Authorization",
                "value": "Bearer {{token}}"
              },
              {
                "key": "Content-Type",
                "value": "application/json"
              }
            ],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"matchType\": \"private\",\n  \"opponentId\": \"uuid-of-opponent\"\n}"
            },
            "url": {
              "raw": "{{baseUrl}}/api/matches",
              "host": ["{{baseUrl}}"],
              "path": ["api", "matches"]
            },
            "description": "Crea una partida privada desafiando a un oponente específico.\n\n**Validación:** No puedes desafiarte a ti mismo\n\n**Response 201:**\n```json\n{\n  \"id\": \"match-uuid\",\n  \"matchType\": \"private\",\n  \"status\": \"pending\",\n  \"player1\": {...},\n  \"player2\": {...}\n}\n```"
          },
          "response": []
        },
        {
          "name": "Get Match by ID",
          "request": {
            "method": "GET",
            "header": [
              {
                "key": "Authorization",
                "value": "Bearer {{token}}"
              }
            ],
            "url": {
              "raw": "{{baseUrl}}/api/matches/{{matchId}}",
              "host": ["{{baseUrl}}"],
              "path": ["api", "matches", "{{matchId}}"]
            },
            "description": "Obtiene el estado actual de una partida.\n\n**Response 200:**\n```json\n{\n  \"id\": \"match-uuid\",\n  \"matchType\": \"public\",\n  \"status\": \"in_progress\",\n  \"player1\": {\n    \"userId\": \"uuid\",\n    \"username\": \"player1\",\n    \"score\": 3\n  },\n  \"player2\": {\n    \"userId\": \"uuid\",\n    \"username\": \"player2\",\n    \"score\": 2\n  },\n  \"winnerId\": null,\n  \"createdAt\": \"2024-01-01T00:00:00Z\",\n  \"updatedAt\": \"2024-01-01T00:05:00Z\"\n}\n```"
          },
          "response": []
        },
        {
          "name": "WebSocket Connection (Info)",
          "request": {
            "method": "GET",
            "header": [],
            "url": {
              "raw": "ws://localhost:3000/api/game/ws?token={{token}}&matchId={{matchId}}",
              "protocol": "ws",
              "host": ["localhost"],
              "port": "3000",
              "path": ["api", "game", "ws"],
              "query": [
                {
                  "key": "token",
                  "value": "{{token}}"
                },
                {
                  "key": "matchId",
                  "value": "{{matchId}}"
                }
              ]
            },
            "description": "**⚠️ NOTA:** Postman no maneja WebSockets correctamente.\n\n**Usar herramientas alternativas:**\n\n**1. wscat (CLI):**\n```bash\nwscat -c \"ws://localhost:3000/api/game/ws?token=YOUR_TOKEN&matchId=MATCH_ID\"\n```\n\n**2. Browser Console:**\n```javascript\nconst ws = new WebSocket(\n  'ws://localhost:3000/api/game/ws?token=YOUR_TOKEN&matchId=MATCH_ID'\n);\n\nws.onopen = () => console.log('✅ Connected');\nws.onmessage = (msg) => console.log('📥', JSON.parse(msg.data));\n\n// Enviar movimientos\nws.send(JSON.stringify({ action: 'MOVE_UP' }));\nws.send(JSON.stringify({ action: 'MOVE_DOWN' }));\n```\n\n**Mensajes del servidor:**\n```json\n{\n  \"event\": \"JOINED_MATCH\",\n  \"data\": {\n    \"matchId\": \"uuid\",\n    \"playerId\": \"your-uuid\",\n    \"status\": \"pending\",\n    \"message\": \"Bienvenido...\"\n  }\n}\n```\n\n**Mensajes al servidor:**\n```json\n{ \"action\": \"MOVE_UP\" }\n{ \"action\": \"MOVE_DOWN\" }\n```"
          },
          "response": []
        }
      ]
    }
  ],
  "variable": [
    {
      "key": "baseUrl",
      "value": "http://localhost:3000",
      "type": "string"
    },
    {
      "key": "token",
      "value": "",
      "type": "string"
    },
    {
      "key": "userId",
      "value": "",
      "type": "string"
    },
    {
      "key": "friendId",
      "value": "",
      "type": "string"
    },
    {
      "key": "matchId",
      "value": "",
      "type": "string"
    },
    {
      "key": "refreshToken",
      "value": "",
      "type": "string"
    },
    {
      "key": "provisionalToken",
      "value": "",
      "type": "string"
    },
    {
      "key": "setupToken",
      "value": "",
      "type": "string"
    },
    {
      "key": "backupCode",
      "value": "",
      "type": "string"
    }
  ]
}
