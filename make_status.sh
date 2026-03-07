#!/bin/bash

# ================================================================================
# CONFIGURACIÓN CENTRALIZADA
# ================================================================================

# Lista de directorios a excluir
EXCLUDE_DIRS=(
    "node_modules"
    ".git"
    ".claude"
    ".cursorrules"
    "docs"
    "dist"
    "build"
    "coverage"
    ".next"
    ".turbo"
    ".cache"
    "out"
    ".vscode"
    "public/assets"
)

# Lista de archivos a excluir (patrones de nombre)
EXCLUDE_FILES=(
    "status_*.txt"
    "status*.txt"
    "pnpm-lock.yaml"
    "package-lock.json"
    "*.db"
    "*.pdf"
    "*.db-shm"
    "*.db-wal"
    "*.log"
    ".DS_Store"
    "tsconfig.tsbuildinfo"
    "*.md"
)

# Extensiones de archivos permitidas (para inclusión)
ALLOWED_EXTENSIONS=(
    "*.tsx"
    "*.ts"
    "*.jsx"
    "*.js"
    "*.json"
    "*.txt"
    "*.yml"
    "*.yaml"
    "*.css"
    "*.scss"
    "*.html"
    "*.sh"
    "*.rb"
	"*.sql"
    "*.prisma"
    "*.env.example"
    ".gitignore"
    ".dockerignore"
    "Dockerfile*"
)

# ================================================================================
# CONFIGURACIÓN DEL SCRIPT
# ================================================================================

# Limpieza
rm -f status*.txt

OUTPUT_FILE="status_$(date '+%Y-%m-%d_%H-%M-%S').txt"

# Colores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# ================================================================================
# FUNCIONES AUXILIARES
# ================================================================================

# Construye el patrón de exclusión para tree
build_tree_exclude_pattern() {
    local pattern=""
    for dir in "${EXCLUDE_DIRS[@]}"; do
        if [ -n "$pattern" ]; then
            pattern+="|"
        fi
        pattern+="$dir"
    done
    # Agregar también los patrones de archivos para tree
    for file in "${EXCLUDE_FILES[@]}"; do
        pattern+="|$file"
    done
    echo "$pattern"
}

# Construye las opciones de exclusión para find
build_find_exclude_options() {
    local options=()

    # Excluir directorios específicos
    for dir in "${EXCLUDE_DIRS[@]}"; do
        options+=("! -path \"*/$dir/*\"")
    done

    # Excluir archivos por patrón
    for file in "${EXCLUDE_FILES[@]}"; do
        options+=("! -name '$file'")
    done

    echo "${options[@]}"
}

# Construye las opciones de inclusión para find
build_find_include_options() {
    local options=()
    local first=true

    for ext in "${ALLOWED_EXTENSIONS[@]}"; do
        if [ "$first" = true ]; then
            options+=("-name '$ext'")
            first=false
        else
            options+=("-o -name '$ext'")
        fi
    done

    echo "${options[@]}"
}

# ================================================================================
# EJECUCIÓN PRINCIPAL
# ================================================================================

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
    # Usar patrones de exclusión centralizados
    tree_exclude_pattern=$(build_tree_exclude_pattern)
    eval "tree -L 4 --charset ascii -I '$tree_exclude_pattern' >> '$OUTPUT_FILE' 2>/dev/null"
else
    # Construir opciones de exclusión para find
    find_exclude_opts=$(build_find_exclude_options)
    eval "find . -maxdepth 4 -type d $find_exclude_opts | sort >> '$OUTPUT_FILE'"
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

# Construir comandos de inclusión y exclusión
find_include_opts=$(build_find_include_options)
find_exclude_opts=$(build_find_exclude_options)

# Ejecutar find con las opciones construidas
eval_command="find . -type f \( ${find_include_opts} \) \( ${find_exclude_opts} \) | sort"
eval "$eval_command" | while IFS= read -r file; do

    # Verificar que el archivo existe
    [ ! -f "$file" ] && continue

    # Verificar si el archivo está en un directorio excluido
    excluded=false
    for dir in "${EXCLUDE_DIRS[@]}"; do
        if [[ "$file" == *"/$dir/"* ]]; then
            excluded=true
            break
        fi
    done

    if [ "$excluded" = true ]; then
        continue
    fi

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
    echo ""
    echo "CONFIGURACIÓN USADA:"
    echo "- Directorios excluidos: ${EXCLUDE_DIRS[*]}"
    echo "- Archivos excluidos: ${EXCLUDE_FILES[*]}"
    echo "- Extensiones incluidas: ${ALLOWED_EXTENSIONS[*]}"
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
echo -e "${BLUE}Configuración usada:${NC}"
echo -e "  Directorios excluidos: ${#EXCLUDE_DIRS[@]}"
echo -e "  Archivos excluidos: ${#EXCLUDE_FILES[@]}"
echo -e "  Extensiones permitidas: ${#ALLOWED_EXTENSIONS[@]}"
echo ""

# Advertencia si es muy grande
if [ "$total_size" -gt 10485760 ]; then  # >10MB
    echo -e "${YELLOW}⚠${NC}  Archivo grande detectado - considera revisar qué se está incluyendo"
fi
