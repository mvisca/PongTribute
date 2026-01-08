#!/bin/bash

# Limpieza
rm -f status*.txt

# Configuración
OUTPUT_FILE="status_$(date '+%Y-%m-%d_%H-%M-%S').txt"

# Colores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# HEADER
cat > "$OUTPUT_FILE" << 'EOF'
================================================================================
PROYECTO: ft_transcendence
================================================================================
EOF

echo "GENERADO: $(date '+%Y-%m-%d %H:%M:%S')" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

# ESTRUCTURA DEL PROYECTO
echo "================================================================================" >> "$OUTPUT_FILE"
echo "ESTRUCTURA DEL PROYECTO" >> "$OUTPUT_FILE"
echo "================================================================================" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

if command -v tree &> /dev/null; then
    tree -L 4 \
        --charset ascii \
        -I 'docs|node_modules|dist|build|.git|.vscode|.next|out|coverage|.cache|.turbo|status_*.txt' \
        >> "$OUTPUT_FILE" 2>/dev/null
else
    find . -maxdepth 4 -type d \
        ! -path '*/node_modules/*' \
        ! -path '*/.git/*' \
        ! -path '*/dist/*' \
        ! -path '*/build/*' \
        ! -path '*/.next/*' \
        | sort >> "$OUTPUT_FILE"
fi

echo "" >> "$OUTPUT_FILE"

# VOLCADO RECURSIVO CON LÍMITES ESTRICTOS
echo "================================================================================" >> "$OUTPUT_FILE"
echo "CONTENIDO COMPLETO DE ARCHIVOS" >> "$OUTPUT_FILE"
echo "================================================================================" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

# Contador de seguridad
file_count=0
max_files=500  # LÍMITE: máximo 500 archivos
total_size=0
max_total_size=$((100 * 1024 * 1024))  # LÍMITE: 100MB total

# Lista de extensiones de texto permitidas
allowed_extensions="tsx|ts|jsx|js|json|md|txt|yml|yaml|css|scss|html|xml|sh|env.example|gitignore|dockerignore|Dockerfile|prisma"

find . -type f \
    \( -name "*.tsx" -o -name "*.ts" -o -name "*.jsx" -o -name "*.js" \
    -o -name "*.json" -o -name "*.md" -o -name "*.txt" \
    -o -name "*.yml" -o -name "*.yaml" -o -name "*.css" -o -name "*.scss" \
    -o -name "*.html" -o -name "*.sh" -o -name "*.prisma" \
    -o -name ".gitignore" -o -name ".dockerignore" \
    -o -name "Dockerfile*" -o -name "*.env.example" \) \
    ! -path '*/node_modules/*' \
    ! -path '*/.git/*' \
    ! -path '*/.claude/*' \
    ! -path '*/docs/*' \
    ! -path '*/dist/*' \
    ! -path '*/build/*' \
    ! -path '*/coverage/*' \
    ! -path '*/.next/*' \
    ! -path '*/.turbo/*' \
    ! -path '*/.cache/*' \
    ! -path '*/out/*' \
    ! -path '*/public/assets/*' \
    ! -name 'status_*.txt' \
    ! -name 'status*.txt' \
    ! -name 'pnpm-lock.yaml' \
    ! -name 'package-lock.json' \
    ! -name '*.db' \
    ! -name '*.pdf' \
    ! -name '*.db-shm' \
    ! -name '*.db-wal' \
    ! -name '*.log' \
    ! -name '.DS_Store' \
    ! -name 'tsconfig.tsbuildinfo' \
    | sort | while IFS= read -r file; do
    
    # Verificar que el archivo existe
    [ ! -f "$file" ] && continue
    
    # Obtener tamaño
    if [[ "$OSTYPE" == "darwin"* ]]; then
        size=$(stat -f%z "$file" 2>/dev/null)
    else
        size=$(stat -c%s "$file" 2>/dev/null)
    fi
    
    # Skip si el archivo es muy grande (>500KB)
    if [ "$size" -gt 512000 ]; then
        echo ">>> ARCHIVO: $file [OMITIDO - ${size} bytes > 500KB]" >> "$OUTPUT_FILE"
        echo "" >> "$OUTPUT_FILE"
        continue
    fi
    
    # Verificar límite total
    total_size=$((total_size + size))
    if [ "$total_size" -gt "$max_total_size" ]; then
        echo ">>> LÍMITE ALCANZADO: 100MB de contenido procesado" >> "$OUTPUT_FILE"
        echo ">>> Archivos restantes omitidos por seguridad" >> "$OUTPUT_FILE"
        break
    fi
    
    # Verificar límite de archivos
    file_count=$((file_count + 1))
    if [ "$file_count" -gt "$max_files" ]; then
        echo ">>> LÍMITE ALCANZADO: ${max_files} archivos procesados" >> "$OUTPUT_FILE"
        echo ">>> Archivos restantes omitidos por seguridad" >> "$OUTPUT_FILE"
        break
    fi
    
    # Procesar archivo
    echo ">>> ARCHIVO: $file (${size} bytes)" >> "$OUTPUT_FILE"
    echo "--------------------------------------------------------------------------------" >> "$OUTPUT_FILE"
    cat "$file" >> "$OUTPUT_FILE" 2>/dev/null || echo "[Error al leer]" >> "$OUTPUT_FILE"
    echo "" >> "$OUTPUT_FILE"
    echo "" >> "$OUTPUT_FILE"
    
    # Feedback cada 50 archivos
    if [ $((file_count % 50)) -eq 0 ]; then
        echo -ne "\r${BLUE}Procesando...${NC} $file_count archivos ($(echo "scale=1; $total_size/1024/1024" | bc 2>/dev/null || echo "?")MB)"
    fi
done

echo "" # Nueva línea después del progreso

# INFORMACIÓN DEL SISTEMA
echo "" >> "$OUTPUT_FILE"
echo "================================================================================" >> "$OUTPUT_FILE"
echo "INFORMACIÓN DEL SISTEMA" >> "$OUTPUT_FILE"
echo "================================================================================" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

{
    echo "Node.js: $(node --version 2>&1 || echo 'no disponible')"
    echo "pnpm: $(pnpm --version 2>&1 || echo 'no disponible')"
    echo ""
    echo "Archivos procesados: $file_count"
    echo "Tamaño total procesado: $(echo "scale=2; $total_size/1024/1024" | bc 2>/dev/null || echo "?")MB"
} >> "$OUTPUT_FILE"

# FOOTER
echo "" >> "$OUTPUT_FILE"
echo "================================================================================" >> "$OUTPUT_FILE"
echo "FIN DEL STATUS - $(date '+%Y-%m-%d %H:%M:%S')" >> "$OUTPUT_FILE"
echo "================================================================================" >> "$OUTPUT_FILE"

# OUTPUT FINAL
FILE_SIZE=$(du -h "$OUTPUT_FILE" | cut -f1)
LINE_COUNT=$(wc -l < "$OUTPUT_FILE")

echo ""
echo -e "${GREEN}✓${NC} Status generado exitosamente"
echo -e "  ${BLUE}Archivo:${NC} $OUTPUT_FILE"
echo -e "  ${BLUE}Archivos incluidos:${NC} $file_count"
echo -e "  ${BLUE}Tamaño:${NC} $FILE_SIZE"
echo -e "  ${BLUE}Líneas:${NC} $LINE_COUNT"
echo ""

# Advertencia si es muy grande
if [ "$total_size" -gt 10485760 ]; then  # >10MB
    echo -e "${YELLOW}⚠${NC}  Archivo grande detectado - considera revisar qué se está incluyendo"
fi
