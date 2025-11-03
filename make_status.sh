#!/bin/bash

# ==============================================================================
# make_status.sh - Generador de status.txt para ft_transcendence
# ==============================================================================
# Genera un snapshot del proyecto excluyendo archivos innecesarios
# Uso: ./make_status.sh

OUTPUT_FILE="status.txt"

# Colores para output (opcional, solo terminal)
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ==============================================================================
# HEADER
# ==============================================================================
cat > "$OUTPUT_FILE" << 'EOF'
================================================================================
PROYECTO: ft_transcendence
FECHA: 
================================================================================

Este archivo contiene un snapshot del proyecto completo.
Generado automaticamente por make_status.sh

EOF

# Agregar fecha
echo "GENERADO: $(date '+%Y-%m-%d %H:%M:%S')" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

# ==============================================================================
# ESTRUCTURA DEL PROYECTO (Tree)
# ==============================================================================
echo "ESTRUCTURA DEL PROYECTO" >> "$OUTPUT_FILE"
echo "================================================================================" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

# Usar tree con ASCII y excluir directorios/archivos innecesarios
tree -L 4 --charset ascii -I 'node_modules|dist|build|.git|.vscode|*.log|pnpm-lock.yaml|*.db' \
  >> "$OUTPUT_FILE" 2>/dev/null

# Si tree no esta disponible, usar find como fallback
if [ $? -ne 0 ]; then
    echo "tree no disponible, usando find..." >> "$OUTPUT_FILE"
    find . -type f -not -path '*/node_modules/*' -not -path '*/.git/*' \
      -not -path '*/dist/*' -not -name 'pnpm-lock.yaml' -not -name '*.db' \
      | head -100 >> "$OUTPUT_FILE"
fi

echo "" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

# ==============================================================================
# ARCHIVOS DE CONFIGURACION
# ==============================================================================
echo "ARCHIVOS DE CONFIGURACION" >> "$OUTPUT_FILE"
echo "================================================================================" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

# Function para agregar archivo con header
add_file() {
    local file=$1
    if [ -f "$file" ]; then
        echo ">>> ARCHIVO: $file" >> "$OUTPUT_FILE"
        echo "--------------------------------------------------------------------------------" >> "$OUTPUT_FILE"
        cat "$file" >> "$OUTPUT_FILE"
        echo "" >> "$OUTPUT_FILE"
        echo "" >> "$OUTPUT_FILE"
    fi
}

# Root configs
add_file "./package.json"
add_file "./.npmrc"
add_file "./.gitignore"
add_file "./tsconfig.json"

# Database configs
add_file "./packages/database/package.json"
add_file "./packages/database/tsconfig.json"

# Shared configs
add_file "./packages/shared/package.json"
add_file "./packages/shared/tsconfig.json"

# ==============================================================================
# ARCHIVOS SQL (Schema, Migrations, Indexes)
# ==============================================================================
echo "ARCHIVOS SQL" >> "$OUTPUT_FILE"
echo "================================================================================" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

# Buscar todos los .sql recursivamente
find ./packages/database/src -name "*.sql" -type f 2>/dev/null | while read -r sql_file; do
    add_file "$sql_file"
done

# ==============================================================================
# TIPOS Y INTERFACES (shared)
# ==============================================================================
echo "TIPOS Y INTERFACES (shared)" >> "$OUTPUT_FILE"
echo "================================================================================" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

# Types
find ./packages/shared/src/types -name "*.ts" -type f 2>/dev/null | while read -r type_file; do
    add_file "$type_file"
done

# Constants
find ./packages/shared/src/constants -name "*.ts" -type f 2>/dev/null | while read -r const_file; do
    add_file "$const_file"
done

# ==============================================================================
# REPOSITORIOS (database)
# ==============================================================================
echo "REPOSITORIOS (database)" >> "$OUTPUT_FILE"
echo "================================================================================" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

find ./packages/database/src/repositories -name "*.ts" -type f 2>/dev/null | while read -r repo_file; do
    add_file "$repo_file"
done

# ==============================================================================
# MAPPERS (database)
# ==============================================================================
echo "MAPPERS (database)" >> "$OUTPUT_FILE"
echo "================================================================================" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

find ./packages/database/src/mappers -name "*.ts" -type f 2>/dev/null | while read -r mapper_file; do
    add_file "$mapper_file"
done

# ==============================================================================
# CONTROLLERS (database)
# ==============================================================================
echo "CONTROLLERS (database)" >> "$OUTPUT_FILE"
echo "================================================================================" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

find ./packages/database/src/controllers -name "*.ts" -type f 2>/dev/null | while read -r controller_file; do
    add_file "$controller_file"
done

# ==============================================================================
# ROUTES (database)
# ==============================================================================
echo "ROUTES (database)" >> "$OUTPUT_FILE"
echo "================================================================================" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

find ./packages/database/src/routes -name "*.ts" -type f 2>/dev/null | while read -r route_file; do
    add_file "$route_file"
done

# ==============================================================================
# SCHEMAS (database)
# ==============================================================================
echo "SCHEMAS DE VALIDACION (database)" >> "$OUTPUT_FILE"
echo "================================================================================" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

find ./packages/database/src/schemas -name "*.ts" -type f 2>/dev/null | while read -r schema_file; do
    add_file "$schema_file"
done

# ==============================================================================
# ARCHIVOS PRINCIPALES (app, connection, config)
# ==============================================================================
echo "ARCHIVOS PRINCIPALES" >> "$OUTPUT_FILE"
echo "================================================================================" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

add_file "./packages/database/src/app.ts"
add_file "./packages/database/src/connection.ts"
add_file "./packages/database/src/config.ts"
add_file "./packages/database/src/index.ts"

# ==============================================================================
# EVENTOS (shared)
# ==============================================================================
echo "EVENTOS (shared)" >> "$OUTPUT_FILE"
echo "================================================================================" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

find ./packages/shared/src/events -name "*.ts" -type f 2>/dev/null | while read -r event_file; do
    add_file "$event_file"
done

# ==============================================================================
# UTILS (shared)
# ==============================================================================
echo "UTILS (shared)" >> "$OUTPUT_FILE"
echo "================================================================================" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

find ./packages/shared/src/utils -name "*.ts" -type f 2>/dev/null | while read -r util_file; do
    add_file "$util_file"
done

# ==============================================================================
# FOOTER
# ==============================================================================
echo "" >> "$OUTPUT_FILE"
echo "================================================================================" >> "$OUTPUT_FILE"
echo "FIN DEL STATUS - Generado: $(date '+%Y-%m-%d %H:%M:%S')" >> "$OUTPUT_FILE"
echo "================================================================================" >> "$OUTPUT_FILE"

# ==============================================================================
# OUTPUT
# ==============================================================================
echo -e "${GREEN}✓${NC} Status generado exitosamente en: ${BLUE}$OUTPUT_FILE${NC}"
echo "  Tamano del archivo: $(du -h $OUTPUT_FILE | cut -f1)"
echo "  Lineas totales: $(wc -l < $OUTPUT_FILE)"