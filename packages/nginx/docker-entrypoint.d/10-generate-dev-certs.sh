#!/bin/sh
set -eu

CERT_DIR="/etc/nginx/certs"
CERT="${CERT_DIR}/tls.crt"
KEY="${CERT_DIR}/tls.key"

mkdir -p "${CERT_DIR}"

if [ ! -f "${CERT}" ] || [ ! -f "${KEY}" ]; then
  echo "[nginx] No TLS certs found. Generating self-signed dev certs..."
  openssl req -x509 -nodes -newkey rsa:2048 \
    -keyout "${KEY}" \
    -out "${CERT}" \
    -days 30 \
    -subj "/CN=localhost" >/dev/null 2>&1
  echo "[nginx] Self-signed cert generated at ${CERT_DIR}"
fi

