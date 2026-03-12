#!/bin/sh
set -eu

CERT_DIR="/etc/nginx/certs"
CERT="${CERT_DIR}/tls.crt"
KEY="${CERT_DIR}/tls.key"

mkdir -p "${CERT_DIR}"

# Require UID and GID to be set (mirrors docker-compose UID/GID requirement)
if [ -z "${HOST_UID:-}" ] || [ -z "${HOST_GID:-}" ]; then
  echo "[nginx] Error: UID and GID must be set in the environment (check your .env and docker-compose env_file)."
  exit 1
fi

if [ ! -f "${CERT}" ] || [ ! -f "${KEY}" ]; then
  echo "[nginx] No TLS certs found. Generating self-signed dev certs..."
  openssl req -x509 -nodes -newkey rsa:2048 \
    -keyout "${KEY}" \
    -out "${CERT}" \
    -days 30 \
    -subj "/CN=localhost" >/dev/null 2>&1
  echo "[nginx] Self-signed cert generated at ${CERT_DIR}"
  # Adjust ownership of certs and directory to match host user (so make nuke can remove without sudo)
  chown "${HOST_UID}:${HOST_GID}" "${CERT}" "${KEY}" "${CERT_DIR}"
fi

