#!/bin/bash

# Script de verificación de seguridad específica
# Verifica aspectos críticos de seguridad del proyecto

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

ERRORS=0
WARNINGS=0

error() {
    echo -e "${RED}❌ ERROR:${NC} $1"
    ((ERRORS++))
}

warning() {
    echo -e "${YELLOW}⚠️  WARNING:${NC} $1"
    ((WARNINGS++))
}

success() {
    echo -e "${GREEN}✅ OK:${NC} $1"
}

echo "🔒 Verificando seguridad del proyecto..."
echo ""

# 1. Verificar .env en .gitignore
echo "1. Verificando protección de .env..."
if grep -qE "^\.env$|^\.env\$" .gitignore 2>/dev/null; then
    success ".env está protegido en .gitignore"
else
    error ".env NO está en .gitignore"
fi

# 2. Verificar que .env no esté en git
echo ""
echo "2. Verificando que .env no esté en el repositorio..."
if git ls-files | grep -q "^\.env$" 2>/dev/null; then
    error ".env está siendo rastreado por git (CRÍTICO)"
else
    success ".env no está en el repositorio"
fi

# 3. Buscar contraseñas en texto plano
echo ""
echo "3. Buscando contraseñas en texto plano..."
if grep -r -iE "password\s*[:=]\s*['\"][^'\"]{3,}['\"]" \
    --include="*.ts" --include="*.js" --include="*.php" \
    --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=.git . 2>/dev/null | \
    grep -v "process\.env" | grep -v "\.env" | grep -v "hash" | grep -v "bcrypt" | \
    grep -v "test" | grep -v "example" | head -1 > /dev/null; then
    error "Posibles contraseñas en texto plano encontradas"
    grep -r -iE "password\s*[:=]\s*['\"][^'\"]{3,}['\"]" \
        --include="*.ts" --include="*.js" --include="*.php" \
        --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=.git . 2>/dev/null | \
        grep -v "process\.env" | grep -v "\.env" | grep -v "hash" | grep -v "bcrypt" | \
        grep -v "test" | head -3 || true
else
    success "No se encontraron contraseñas en texto plano"
fi

# 4. Verificar hashing de contraseñas
echo ""
echo "4. Verificando hashing de contraseñas..."
HASH_LIBS=("bcrypt" "argon2" "scrypt" "pbkdf2")
FOUND_HASH=false
for lib in "${HASH_LIBS[@]}"; do
    if grep -r -i "$lib" --include="*.ts" --include="*.js" --include="*.php" \
        --exclude-dir=node_modules --exclude-dir=dist . 2>/dev/null | head -1 > /dev/null; then
        FOUND_HASH=true
        success "Se encontró uso de $lib para hashing"
        break
    fi
done

if [ "$FOUND_HASH" = false ]; then
    error "NO se encontró ninguna librería de hashing (bcrypt, argon2, scrypt, pbkdf2)"
fi

# 5. Verificar protección SQL Injection
echo ""
echo "5. Verificando protección contra SQL Injection..."
# Buscar prepared statements
if grep -r -iE "(prepare|prepared|parameter|bind|execute.*\?|query.*\?)" \
    --include="*.ts" --include="*.js" --include="*.php" \
    --exclude-dir=node_modules --exclude-dir=dist . 2>/dev/null | head -1 > /dev/null; then
    success "Se encontraron indicios de prepared statements"
else
    warning "No se encontraron prepared statements obvios"
fi

# Buscar concatenación peligrosa
DANGEROUS_PATTERNS=(
    "SELECT.*\\+.*FROM"
    "INSERT.*\\+.*INTO"
    "UPDATE.*\\+.*SET"
    "DELETE.*\\+.*FROM"
)

FOUND_DANGEROUS=false
for pattern in "${DANGEROUS_PATTERNS[@]}"; do
    if grep -r -iE "$pattern" --include="*.ts" --include="*.js" --include="*.php" \
        --exclude-dir=node_modules --exclude-dir=dist . 2>/dev/null | \
        grep -v "test" | grep -v "example" | head -1 > /dev/null; then
        FOUND_DANGEROUS=true
        break
    fi
done

if [ "$FOUND_DANGEROUS" = true ]; then
    warning "Posible concatenación peligrosa en queries SQL encontrada"
else
    success "No se encontró concatenación peligrosa obvia en SQL"
fi

# 6. Verificar protección XSS
echo ""
echo "6. Verificando protección contra XSS..."
# Buscar sanitización
SANITIZE_PATTERNS=("sanitize" "escape" "encode" "xss")
FOUND_SANITIZE=false
for pattern in "${SANITIZE_PATTERNS[@]}"; do
    if grep -r -i "$pattern" --include="*.ts" --include="*.js" --include="*.php" \
        --exclude-dir=node_modules --exclude-dir=dist . 2>/dev/null | head -1 > /dev/null; then
        FOUND_SANITIZE=true
        break
    fi
done

if [ "$FOUND_SANITIZE" = true ]; then
    success "Se encontraron indicios de sanitización/escape"
else
    warning "No se encontraron funciones obvias de sanitización XSS"
fi

# 7. Verificar HTTPS/wss
echo ""
echo "7. Verificando uso de HTTPS/wss..."
if grep -r -E "https://|wss://" --include="*.ts" --include="*.js" --include="*.php" \
    --exclude-dir=node_modules --exclude-dir=dist . 2>/dev/null | head -1 > /dev/null; then
    success "Se encontraron referencias a HTTPS/wss"
else
    warning "No se encontraron referencias a HTTPS/wss (obligatorio si hay backend)"
fi

# 8. Verificar validación de entrada
echo ""
echo "8. Verificando validación de entrada de usuario..."
VALIDATION_PATTERNS=("validate" "validator" "schema" "zod" "joi" "yup")
FOUND_VALIDATION=false
for pattern in "${VALIDATION_PATTERNS[@]}"; do
    if grep -r -i "$pattern" --include="*.ts" --include="*.js" --include="*.php" \
        --exclude-dir=node_modules --exclude-dir=dist . 2>/dev/null | head -1 > /dev/null; then
        FOUND_VALIDATION=true
        break
    fi
done

if [ "$FOUND_VALIDATION" = true ]; then
    success "Se encontraron indicios de validación de entrada"
else
    warning "No se encontraron librerías obvias de validación"
fi

# Resumen
echo ""
echo "=========================================="
echo "🔒 RESUMEN DE SEGURIDAD"
echo "=========================================="
echo -e "${GREEN}✅ Errores: $ERRORS${NC}"
echo -e "${YELLOW}⚠️  Warnings: $WARNINGS${NC}"
echo ""

if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}✅ No se encontraron errores críticos de seguridad${NC}"
    exit 0
else
    echo -e "${RED}❌ Se encontraron $ERRORS error(es) crítico(s) de seguridad${NC}"
    exit 1
fi


