#!/bin/bash

# Script de verificación de tecnologías
# Verifica que se usen las tecnologías correctas según los módulos

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

echo "🔧 Verificando tecnologías del proyecto..."
echo ""

# 1. Verificar TypeScript en frontend
echo "1. Verificando TypeScript en frontend..."
if [ -d "packages/frontend" ]; then
    if [ -f "packages/frontend/tsconfig.json" ]; then
        success "Frontend tiene tsconfig.json"
    else
        error "Frontend NO tiene tsconfig.json (TypeScript es obligatorio)"
    fi
    
    TS_FILES=$(find packages/frontend/src -name "*.ts" -o -name "*.tsx" 2>/dev/null | wc -l)
    JS_FILES=$(find packages/frontend/src -name "*.js" -o -name "*.jsx" 2>/dev/null | wc -l)
    
    if [ "$TS_FILES" -gt 0 ]; then
        success "Frontend tiene $TS_FILES archivo(s) TypeScript"
    fi
    
    if [ "$JS_FILES" -gt "$TS_FILES" ] && [ "$JS_FILES" -gt 0 ]; then
        warning "Frontend tiene más archivos .js que .ts (TypeScript es obligatorio)"
    fi
else
    warning "Directorio packages/frontend no encontrado"
fi

# 2. Verificar SQLite (si hay módulo Database)
echo ""
echo "2. Verificando uso de SQLite..."
if [ -d "db-data" ] || [ -f "*.db" ] 2>/dev/null || find . -name "*.db" -not -path "./node_modules/*" -not -path "./dist/*" 2>/dev/null | head -1 > /dev/null; then
    success "Se encontraron archivos de base de datos SQLite"
    
    # Verificar que NO se usen otras bases de datos
    OTHER_DBS=("mysql" "postgresql" "postgres" "mongodb")
    for db in "${OTHER_DBS[@]}"; do
        if grep -r -i "$db" --include="package.json" --exclude-dir=node_modules . 2>/dev/null | \
            grep -v "node_modules" | head -1 > /dev/null; then
            error "Se encontró dependencia de $db (SQLite es obligatorio con módulo Database)"
        fi
    done
else
    warning "No se encontraron archivos .db (OK si no se usa módulo Database)"
fi

# 3. Verificar Fastify (si hay módulo Framework)
echo ""
echo "3. Verificando Fastify (si hay módulo Framework)..."
if grep -r -i "fastify" --include="package.json" --exclude-dir=node_modules . 2>/dev/null | head -1 > /dev/null; then
    success "Se encontró Fastify en dependencias"
    
    # Verificar que NO se use otro framework de backend
    OTHER_FRAMEWORKS=("express" "koa" "hapi" "nest")
    for framework in "${OTHER_FRAMEWORKS[@]}"; do
        if grep -r -i "$framework" --include="package.json" --exclude-dir=node_modules . 2>/dev/null | \
            grep -v "node_modules" | head -1 > /dev/null; then
            warning "Se encontró $framework (Fastify es obligatorio con módulo Framework)"
        fi
    done
else
    warning "No se encontró Fastify (OK si no se usa módulo Framework, o si se usa PHP)"
fi

# 4. Verificar Tailwind CSS (si hay módulo FrontEnd)
echo ""
echo "4. Verificando Tailwind CSS (si hay módulo FrontEnd)..."
if grep -r -i "tailwind" --include="package.json" --exclude-dir=node_modules . 2>/dev/null | head -1 > /dev/null; then
    success "Se encontró Tailwind CSS en dependencias"
    
    # Verificar que NO se usen otros frameworks CSS principales
    OTHER_CSS_FRAMEWORKS=("bootstrap" "material-ui" "@mui" "ant-design" "chakra")
    for css_fw in "${OTHER_CSS_FRAMEWORKS[@]}"; do
        if grep -r -i "$css_fw" --include="package.json" --exclude-dir=node_modules . 2>/dev/null | \
            grep -v "node_modules" | head -1 > /dev/null; then
            warning "Se encontró $css_fw (Tailwind CSS es obligatorio con módulo FrontEnd, nada más)"
        fi
    done
else
    warning "No se encontró Tailwind CSS (OK si no se usa módulo FrontEnd)"
fi

# 5. Verificar Docker
echo ""
echo "5. Verificando Docker..."
if [ -f "Dockerfile" ]; then
    success "Se encontró Dockerfile"
elif [ -f "docker-compose.yml" ] || [ -f "docker-compose.yaml" ]; then
    success "Se encontró docker-compose.yml"
else
    error "NO se encontraron archivos de Docker (Docker es OBLIGATORIO)"
fi

# 6. Verificar Node.js version
echo ""
echo "6. Verificando versión de Node.js..."
if [ -f "package.json" ]; then
    NODE_VERSION=$(node --version 2>/dev/null || echo "not found")
    if [ "$NODE_VERSION" != "not found" ]; then
        success "Node.js instalado: $NODE_VERSION"
        
        # Verificar que esté en el rango correcto si hay engines
        if grep -q "\"node\"" package.json; then
            success "Versión de Node.js especificada en package.json"
        fi
    else
        warning "Node.js no encontrado en PATH"
    fi
fi

# Resumen
echo ""
echo "=========================================="
echo "🔧 RESUMEN DE TECNOLOGÍAS"
echo "=========================================="
echo -e "${GREEN}✅ Errores: $ERRORS${NC}"
echo -e "${YELLOW}⚠️  Warnings: $WARNINGS${NC}"
echo ""

if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}✅ Tecnologías verificadas correctamente${NC}"
    exit 0
else
    echo -e "${RED}❌ Se encontraron $ERRORS error(es)${NC}"
    exit 1
fi


