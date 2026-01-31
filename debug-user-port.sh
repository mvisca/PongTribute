#!/bin/bash
# debug-user-port.sh

echo "Iniciando port forwarding para User service (puerto 3001)..."
echo "Presiona Ctrl+C para detener"

# Detectar el nombre de la red automáticamente
NETWORK_NAME=$(docker inspect ft_transcendence_user --format='{{range $net, $conf := .NetworkSettings.Networks}}{{$net}}{{end}}' 2>/dev/null)

if [ -z "$NETWORK_NAME" ]; then
  echo "Error: No se pudo encontrar la red. ¿Está corriendo el contenedor ft_transcendence_user?"
  exit 1
fi

echo "Usando red: $NETWORK_NAME"

docker run -it --rm \
  --name socat-user-debug \
  --network "$NETWORK_NAME" \
  -p 3001:3001 \
  alpine/socat \
  TCP-LISTEN:3001,fork,reuseaddr TCP:ft_transcendence_user:3001