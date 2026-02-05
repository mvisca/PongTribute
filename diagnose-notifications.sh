#!/bin/bash

echo "🔍 DIAGNÓSTICO: Sistema de notificaciones"
echo "=========================================="
echo ""

API="http://localhost/api"

# Crear dos usuarios y hacerlos amigos
echo "📝 Creando usuarios Alice y Bob..."

# Alice
curl -s -X POST "$API/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"username":"alice","email":"alice@test.com","password":"Test123!","avatar":"https://i.pravatar.cc/150?u=alice"}' > /dev/null

TOKEN_ALICE=$(curl -s -X POST "$API/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@test.com","password":"Test123!"}' \
  | jq -r '.accessToken')

ALICE_ID=$(echo $TOKEN_ALICE | jq -R 'split(".")[1] | @base64d' | jq -r '.id')

# Bob
curl -s -X POST "$API/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"username":"bob","email":"bob@test.com","password":"Test123!","avatar":"https://i.pravatar.cc/150?u=bob"}' > /dev/null

TOKEN_BOB=$(curl -s -X POST "$API/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"bob@test.com","password":"Test123!"}' \
  | jq -r '.accessToken')

BOB_ID=$(echo $TOKEN_BOB | jq -R 'split(".")[1] | @base64d' | jq -r '.id')

echo "✓ Alice ID: $ALICE_ID"
echo "✓ Bob ID: $BOB_ID"
echo ""

# Crear amistad
echo "👥 Creando amistad..."
curl -s -X POST "$API/friendships" \
  -H "Authorization: Bearer $TOKEN_ALICE" \
  -H "Content-Type: application/json" \
  -d "{\"friendId\":\"$BOB_ID\"}" > /dev/null

curl -s -X PATCH "$API/friendships/$ALICE_ID" \
  -H "Authorization: Bearer $TOKEN_BOB" \
  -H "Content-Type: application/json" \
  -d '{"accepted":true}' > /dev/null

echo "✓ Amistad creada y aceptada"
echo ""

# Verificar endpoint de amigos
echo "🔍 Verificando endpoint /internal/users/{id}/friends..."
echo ""

# Test 1: Endpoint existe?
echo "Test 1: ¿El endpoint responde?"
FRIENDS_RESPONSE=$(curl -s -w "\n%{http_code}" \
  -H "X-Service-Secret: $(grep SERVICE_SECRET .env | cut -d '=' -f2)" \
  "http://localhost:3001/internal/users/$ALICE_ID/friends")

HTTP_CODE=$(echo "$FRIENDS_RESPONSE" | tail -n1)
BODY=$(echo "$FRIENDS_RESPONSE" | head -n-1)

if [ "$HTTP_CODE" = "200" ]; then
  echo "  ✓ Endpoint responde OK (200)"
  echo "  Amigos de Alice: $BODY"
else
  echo "  ✗ ERROR: HTTP $HTTP_CODE"
  echo "  Respuesta: $BODY"
fi
echo ""

# Test 2: Listar amigos desde la API
echo "Test 2: Listar amistades de Alice (API pública):"
curl -s "$API/friendships?status=accepted" \
  -H "Authorization: Bearer $TOKEN_ALICE" \
  | jq '.'
echo ""

# Test 3: Monitor Redis
echo "Test 3: Monitoreando eventos Redis..."
echo "  (Presiona Ctrl+C para detener después de ver eventos)"
echo ""
echo "  Ahora haz LOGIN/LOGOUT en Postman y observa:"
echo ""

# Mostrar comandos útiles
echo "📋 Comandos para testing manual:"
echo ""
echo "# Ver logs de COMMS en tiempo real:"
echo "docker compose logs -f comms"
echo ""
echo "# Ver logs de USER en tiempo real:"
echo "docker compose logs -f user"
echo ""
echo "# Monitor Redis:"
echo "docker exec -it ft_transcendence_redis redis-cli MONITOR"
echo ""
echo "# WebSocket de Bob (pega en Hoppscotch):"
echo "ws://localhost/api/comms/ws?token=$TOKEN_BOB"
echo ""
echo "# Hacer login de Alice (para que Bob reciba notificación):"
echo "curl -X POST $API/auth/login -H 'Content-Type: application/json' -d '{\"email\":\"alice@test.com\",\"password\":\"Test123!\"}'"
echo ""