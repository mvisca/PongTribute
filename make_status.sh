#!/bin/bash

OUTPUT_FILE="status.txt"
> "$OUTPUT_FILE"

process_files() {
    local section="$1"
    shift
    
    echo "🎯 $section" >> "$OUTPUT_FILE"
    echo "==============================================" >> "$OUTPUT_FILE"
    echo "" >> "$OUTPUT_FILE"

    find . -type f \( "$@" \) \
        ! -path "*/node_modules/*" \
        ! -path "*/dist/*" \
        ! -path "*/build/*" \
        ! -path "*/.git/*" \
        ! -name ".gitignore" \
        ! -name ".eslintignore" \
        ! -name "*.min.*" \
        ! -name "package-lock.json" \
        ! -name "yarn.lock" \
        ! -name "*.tsbuildinfo" \
        -print0 2>/dev/null | while IFS= read -r -d '' file; do
            echo "📁 ARCHIVO: $file" >> "$OUTPUT_FILE"
            echo "────────────────────────────────────────────────" >> "$OUTPUT_FILE"
            cat "$file" >> "$OUTPUT_FILE"
            echo -e "\n\n" >> "$OUTPUT_FILE"
        done
}

echo "🌳 ESTRUCTURA DEL PROYECTO" >> "$OUTPUT_FILE"
echo "==============================================" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

if command -v tree >/dev/null 2>&1; then
    tree -a -I 'node_modules|docs|dist|build|.git' >> "$OUTPUT_FILE" 2>/dev/null || \
    echo "❌ 'tree' no disponible o error al ejecutar" >> "$OUTPUT_FILE"
else
    echo "⚠️  'tree' no instalado. Usando alternativa con find:" >> "$OUTPUT_FILE"
    find . -type d ! -path "*/node_modules*" ! -path "*/dist*" ! -path "*/build*" ! -path "*/.git*" | sort >> "$OUTPUT_FILE"
fi

echo -e "\n\n" >> "$OUTPUT_FILE"

# Archivos a procesar
process_files "TYPESCRIPT FILES" -name "*.ts" -o -name "*.tsx"
process_files "JSON FILES" -name "*.json"
process_files "YAML FILES" -name "*.yaml" -o -name "*.yml"
process_files "SQL FILES" -name "*.sql"
process_files "CONFIG FILES" -name "*.config.js" -o -name "*.config.ts" -o -name "*.conf"

echo "✅ PROCESO COMPLETADO" >> "$OUTPUT_FILE"
echo "==============================================" >> "$OUTPUT_FILE"
echo "Archivo generado: $OUTPUT_FILE" >> "$OUTPUT_FILE"
echo "Total líneas: $(wc -l < "$OUTPUT_FILE")" >> "$OUTPUT_FILE"

echo "✅ Proceso completado. Revisa $OUTPUT_FILE"
echo "📊 Resumen:"
wc -l "$OUTPUT_FILE"
