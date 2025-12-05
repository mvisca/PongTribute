#!/bin/bash

# Script de verificación de reglas del proyecto ft_transcendence
# Este script verifica que el código cumpla con las reglas críticas del proyecto

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Contador de errores
ERRORS=0
WARNINGS=0

# Función para reportar errores
error() {
    echo -e "${RED}❌ ERROR:${NC} $1"
    ((ERRORS++))
}

# Función para reportar warnings
warning() {
    echo -e "${YELLOW}⚠️  WARNING:${NC} $1"
    ((WARNINGS++))
}

# Función para reportar éxito
success() {
    echo -e "${GREEN}✅ OK:${NC} $1"
}

echo "🔍 Verificando reglas del proyecto ft_transcendence..."
echo ""

# 1. Verificar que .env esté en .gitignore
echo "1. Verificando que .env esté en .gitignore..."
if grep -q "^\.env$" .gitignore 2>/dev/null || grep -q "^\.env\$" .gitignore 2>/dev/null; then
    success ".env está en .gitignore"
else
    error ".env NO está en .gitignore (CRÍTICO: credenciales expuestas causan fallo del proyecto)"
fi

# 2. Verificar que no haya credenciales hardcodeadas
echo ""
echo "2. Verificando que no haya credenciales hardcodeadas..."
CREDENTIAL_PATTERNS=(
    "password\s*=\s*['\"][^'\"]+['\"]"
    "api[_-]?key\s*=\s*['\"][^'\"]+['\"]"
    "secret\s*=\s*['\"][^'\"]+['\"]"
    "token\s*=\s*['\"][^'\"]+['\"]"
    "PASSWORD\s*=\s*['\"][^'\"]+['\"]"
    "API_KEY\s*=\s*['\"][^'\"]+['\"]"
    "SECRET\s*=\s*['\"][^'\"]+['\"]"
)

FOUND_CREDS=false
for pattern in "${CREDENTIAL_PATTERNS[@]}"; do
    # Buscar en archivos .ts, .js, .php excluyendo node_modules y dist
    if grep -r -E "$pattern" --include="*.ts" --include="*.js" --include="*.php" \
        --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=.git . 2>/dev/null | \
        grep -v "\.env" | grep -v "process\.env" | grep -v "import.*env" | grep -v "//.*test" | grep -v "example" > /dev/null; then
        FOUND_CREDS=true
        break
    fi
done

if [ "$FOUND_CREDS" = true ]; then
    warning "Posibles credenciales hardcodeadas encontradas. Revisar manualmente."
    echo "   Buscando patrones sospechosos..."
    grep -r -E "password\s*=\s*['\"][^'\"]+['\"]|api[_-]?key\s*=\s*['\"][^'\"]+['\"]" \
        --include="*.ts" --include="*.js" --include="*.php" \
        --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=.git . 2>/dev/null | \
        grep -v "\.env" | grep -v "process\.env" | grep -v "import.*env" | head -5 || true
else
    success "No se encontraron credenciales hardcodeadas obvias"
fi

# 3. Verificar uso de TypeScript en frontend
echo ""
echo "3. Verificando uso de TypeScript en frontend..."
if [ -d "packages/frontend" ]; then
    if [ -f "packages/frontend/tsconfig.json" ]; then
        success "Frontend usa TypeScript (tsconfig.json encontrado)"
    else
        error "Frontend NO tiene tsconfig.json (TypeScript es obligatorio)"
    fi
    
    # Verificar que haya archivos .ts
    TS_COUNT=$(find packages/frontend/src -name "*.ts" -o -name "*.tsx" 2>/dev/null | wc -l)
    if [ "$TS_COUNT" -gt 0 ]; then
        success "Frontend tiene archivos TypeScript ($TS_COUNT archivos)"
    else
        warning "No se encontraron archivos .ts/.tsx en packages/frontend/src"
    fi
else
    warning "Directorio packages/frontend no encontrado"
fi

# 4. Verificar uso de SQLite si hay módulo de DB
echo ""
echo "4. Verificando uso de SQLite (si hay módulo Database)..."
if [ -d "packages/user" ] || [ -d "db-data" ]; then
    # Buscar referencias a SQLite
    if grep -r -i "sqlite" --include="*.ts" --include="*.js" --include="*.php" \
        --exclude-dir=node_modules --exclude-dir=dist . 2>/dev/null | head -1 > /dev/null; then
        success "Se encontraron referencias a SQLite"
    else
        warning "No se encontraron referencias a SQLite (verificar si se usa módulo Database)"
    fi
    
    # Verificar que NO se usen otras bases de datos
    OTHER_DBS=("mysql" "postgresql" "postgres" "mongodb" "redis")
    for db in "${OTHER_DBS[@]}"; do
        if grep -r -i "$db" --include="*.ts" --include="*.js" --include="*.php" \
            --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=.git . 2>/dev/null | \
            grep -v "node_modules" | grep -v "package.json" | grep -v "README" | head -1 > /dev/null; then
            warning "Se encontraron referencias a $db (SQLite es obligatorio con módulo Database)"
        fi
    done
else
    warning "No se encontró módulo de base de datos (esto es OK si no se usa)"
fi

# 5. Verificar protección contra SQL Injection
echo ""
echo "5. Verificando protección contra SQL Injection..."
# Buscar uso de prepared statements o parámetros
if grep -r -E "(prepare|prepared|parameter|bind|execute.*\?)" --include="*.ts" --include="*.js" --include="*.php" \
    --exclude-dir=node_modules --exclude-dir=dist . 2>/dev/null | head -1 > /dev/null; then
    success "Se encontraron indicios de uso de prepared statements"
else
    warning "No se encontraron prepared statements obvios. Verificar manualmente protección SQL."
fi

# Buscar concatenación directa de strings en queries SQL (peligroso)
if grep -r -E "SELECT.*\+|INSERT.*\+|UPDATE.*\+|DELETE.*\+" --include="*.ts" --include="*.js" --include="*.php" \
    --exclude-dir=node_modules --exclude-dir=dist . 2>/dev/null | \
    grep -v "//.*safe" | grep -v "test" | head -1 > /dev/null; then
    warning "Posible concatenación de strings en queries SQL encontrada (revisar manualmente)"
fi

# 6. Verificar hashing de contraseñas
echo ""
echo "6. Verificando hashing de contraseñas..."
HASH_FUNCTIONS=("bcrypt" "argon2" "scrypt" "pbkdf2" "hash.*password" "hashPassword")
FOUND_HASH=false
for hash_func in "${HASH_FUNCTIONS[@]}"; do
    if grep -r -i "$hash_func" --include="*.ts" --include="*.js" --include="*.php" \
        --exclude-dir=node_modules --exclude-dir=dist . 2>/dev/null | head -1 > /dev/null; then
        FOUND_HASH=true
        break
    fi
done

if [ "$FOUND_HASH" = true ]; then
    success "Se encontraron funciones de hashing de contraseñas"
else
    error "NO se encontraron funciones de hashing de contraseñas (OBLIGATORIO)"
fi

# 7. Verificar uso de HTTPS/wss
echo ""
echo "7. Verificando uso de HTTPS/wss..."
if grep -r -E "https://|wss://" --include="*.ts" --include="*.js" --include="*.php" \
    --exclude-dir=node_modules --exclude-dir=dist . 2>/dev/null | head -1 > /dev/null; then
    success "Se encontraron referencias a HTTPS/wss"
else
    warning "No se encontraron referencias a HTTPS/wss (obligatorio si hay backend)"
fi

# Verificar que NO se use ws:// o http:// en producción
if grep -r -E "ws://|http://" --include="*.ts" --include="*.js" --include="*.php" \
    --exclude-dir=node_modules --exclude-dir=dist . 2>/dev/null | \
    grep -v "localhost" | grep -v "127.0.0.1" | grep -v "test" | grep -v "example" | head -1 > /dev/null; then
    warning "Se encontraron referencias a ws:// o http:// (usar wss:// y https:// en producción)"
fi

# 8. Verificar Docker
echo ""
echo "8. Verificando Docker..."
if [ -f "Dockerfile" ] || [ -f "docker-compose.yml" ] || [ -f "docker-compose.yaml" ]; then
    success "Se encontraron archivos de Docker"
else
    error "NO se encontraron archivos de Docker (Docker es OBLIGATORIO)"
fi

# 9. Verificar que no se use A* para IA (si hay módulo AI)
echo ""
echo "9. Verificando restricciones de IA..."
if grep -r -i "a-star\|a\*\|astar" --include="*.ts" --include="*.js" --include="*.php" \
    --exclude-dir=node_modules --exclude-dir=dist . 2>/dev/null | head -1 > /dev/null; then
    error "Se encontró uso de algoritmo A* (PROHIBIDO para IA)"
else
    success "No se encontró uso de algoritmo A*"
fi

# 10. Verificar estructura SPA
echo ""
echo "10. Verificando estructura SPA..."
if [ -d "packages/frontend" ]; then
    if [ -f "packages/frontend/index.html" ] || [ -f "packages/frontend/src/index.html" ]; then
        success "Estructura de SPA encontrada"
    else
        warning "No se encontró index.html en frontend"
    fi
else
    warning "Directorio frontend no encontrado"
fi

# Resumen
echo ""
echo "=========================================="
echo "📊 RESUMEN DE VERIFICACIÓN"
echo "=========================================="
echo -e "${GREEN}✅ Errores encontrados: $ERRORS${NC}"
echo -e "${YELLOW}⚠️  Warnings encontrados: $WARNINGS${NC}"
echo ""

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}🎉 ¡Todo parece estar bien!${NC}"
    exit 0
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠️  Hay algunos warnings, pero no hay errores críticos.${NC}"
    exit 0
else
    echo -e "${RED}❌ Se encontraron $ERRORS error(es) crítico(s). Por favor, corrígelos antes de continuar.${NC}"
    exit 1
fi


