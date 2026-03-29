#!/bin/bash

# ================================================================================
# CONFIGURACIÓN — compatible macOS bash 3.2
# ================================================================================

FRONTEND_DIR="$(cd "$(dirname "$0")" && pwd)"
OUTPUT_FILE="${FRONTEND_DIR}/status_frontend_$(date '+%Y-%m-%d_%H-%M-%S').txt"
TEMP_FILE="${FRONTEND_DIR}/.status_tmp_$$"

MAX_FILES=300
MAX_FILE_SIZE=$((200 * 1024))
MAX_TOTAL_SIZE=$((20 * 1024 * 1024))

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

trap "rm -f '$TEMP_FILE'" EXIT

# ================================================================================
# BUSCAR ARCHIVOS → fichero temporal (evita subshell en el while)
# ================================================================================

echo -e "${BLUE}Recopilando archivos de frontend...${NC}"

find "$FRONTEND_DIR" -type f \
    ! -path "*/node_modules/*" \
    ! -path "*/dist/*" \
    ! -path "*/build/*" \
    ! -path "*/.cache/*" \
    ! -path "*/.turbo/*" \
    ! -path "*/coverage/*" \
    ! -name "status_frontend*.txt" \
    ! -name "pnpm-lock.yaml" \
    ! -name "package-lock.json" \
    ! -name "*.db" \
    ! -name "*.db-shm" \
    ! -name "*.db-wal" \
    ! -name "*.log" \
    ! -name ".DS_Store" \
    ! -name "*.tsbuildinfo" \
    \( \
        -name "*.tsx" -o -name "*.ts" -o \
        -name "*.jsx" -o -name "*.js" -o \
        -name "*.json" -o -name "*.css" -o \
        -name "*.scss" -o -name "*.html" -o \
        -name "*.sh" -o -name "*.yml" -o \
        -name "*.yaml" -o -name "*.env.example" -o \
        -name ".gitignore" \
    \) \
    | sort > "$TEMP_FILE"

TOTAL_FOUND=$(wc -l < "$TEMP_FILE" | tr -d ' ')
echo -e "  Encontrados: ${TOTAL_FOUND} archivos candidatos"

# ================================================================================
# HEADER
# ================================================================================

cat > "$OUTPUT_FILE" << EOF
================================================================================
FRONTEND STATUS: ft_transcendence
================================================================================
GENERADO: $(date '+%Y-%m-%d %H:%M:%S')
DIRECTORIO: $FRONTEND_DIR

================================================================================
ESTRUCTURA
================================================================================

EOF

if command -v tree &> /dev/null; then
    tree "$FRONTEND_DIR" -L 5 --charset ascii \
        -I "node_modules|dist|build|.cache|.turbo|coverage" >> "$OUTPUT_FILE" 2>/dev/null
else
    find "$FRONTEND_DIR" -maxdepth 5 -type d \
        ! -path "*/node_modules/*" \
        ! -path "*/dist/*" \
        | sort >> "$OUTPUT_FILE"
fi

{
    echo ""
    echo "================================================================================"
    echo "CONTENIDO DE ARCHIVOS"
    echo "================================================================================"
    echo ""
} >> "$OUTPUT_FILE"

# ================================================================================
# VOLCAR ARCHIVOS — while < fichero (sin subshell, contadores funcionan)
# ================================================================================

file_count=0
total_size=0
skipped=0
limit_reached=0

while IFS= read -r file; do
    [ ! -f "$file" ] && continue
    [ "$limit_reached" -eq 1 ] && break

    if [[ "$OSTYPE" == "darwin"* ]]; then
        size=$(stat -f%z "$file" 2>/dev/null || echo 0)
    else
        size=$(stat -c%s "$file" 2>/dev/null || echo 0)
    fi

    if [ "$size" -gt "$MAX_FILE_SIZE" ]; then
        echo ">>> OMITIDO (${size} bytes > 200KB): ${file#$FRONTEND_DIR/}" >> "$OUTPUT_FILE"
        echo "" >> "$OUTPUT_FILE"
        skipped=$((skipped + 1))
        continue
    fi

    new_total=$((total_size + size))
    if [ "$new_total" -gt "$MAX_TOTAL_SIZE" ]; then
        echo ">>> LÍMITE TOTAL ALCANZADO (20MB) — archivos restantes omitidos" >> "$OUTPUT_FILE"
        limit_reached=1
        break
    fi

    if [ "$file_count" -ge "$MAX_FILES" ]; then
        echo ">>> LÍMITE DE ARCHIVOS ($MAX_FILES) — archivos restantes omitidos" >> "$OUTPUT_FILE"
        limit_reached=1
        break
    fi

    total_size=$new_total
    file_count=$((file_count + 1))
    rel_path="${file#$FRONTEND_DIR/}"

    echo ">>> ARCHIVO: ./$rel_path (${size} bytes)" >> "$OUTPUT_FILE"
    echo "--------------------------------------------------------------------------------" >> "$OUTPUT_FILE"
    cat "$file" >> "$OUTPUT_FILE" 2>/dev/null || echo "[Error al leer]" >> "$OUTPUT_FILE"
    echo "" >> "$OUTPUT_FILE"
    echo "" >> "$OUTPUT_FILE"

    if [ $((file_count % 20)) -eq 0 ]; then
        mb=$(echo "scale=1; $total_size/1024/1024" | bc 2>/dev/null || echo "?")
        echo -ne "\r  ${BLUE}Procesando...${NC} $file_count archivos · ${mb}MB"
    fi

done < "$TEMP_FILE"

echo ""

# ================================================================================
# FOOTER
# ================================================================================

{
    echo ""
    echo "================================================================================"
    echo "RESUMEN"
    echo "================================================================================"
    echo ""
    echo "Node.js : $(node --version 2>&1)"
    echo "pnpm    : $(pnpm --version 2>&1)"
    echo ""
    echo "Archivos incluidos : $file_count"
    echo "Archivos omitidos  : $skipped"
    echo "Tamaño total       : $(echo "scale=2; $total_size/1024/1024" | bc 2>/dev/null || echo "?")MB"
    echo ""
    echo "================================================================================"
    echo "FIN DEL STATUS - $(date '+%Y-%m-%d %H:%M:%S')"
    echo "================================================================================"
} >> "$OUTPUT_FILE"

# ================================================================================
# RESUMEN EN TERMINAL
# ================================================================================

FILE_SIZE=$(du -h "$OUTPUT_FILE" | cut -f1)
LINE_COUNT=$(wc -l < "$OUTPUT_FILE" | tr -d ' ')

echo ""
echo -e "${GREEN}✓ Status generado${NC}"
echo -e "  ${BLUE}Archivo  :${NC} $(basename "$OUTPUT_FILE")"
echo -e "  ${BLUE}Archivos :${NC} $file_count incluidos, $skipped omitidos"
echo -e "  ${BLUE}Tamaño   :${NC} $FILE_SIZE"
echo -e "  ${BLUE}Líneas   :${NC} $LINE_COUNT"
echo ""

if [ "$file_count" -eq 0 ]; then
    echo -e "${YELLOW}⚠ No se procesó ningún archivo — asegúrate de ejecutar desde packages/frontend/${NC}"
fi

