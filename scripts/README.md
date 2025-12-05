# Scripts de Verificación

Este directorio contiene scripts para verificar que el código cumpla con las reglas del proyecto ft_transcendence.

## Scripts Disponibles

### `check-rules.sh`
Verificación completa de todas las reglas del proyecto:
- Verificación de .env en .gitignore
- Búsqueda de credenciales hardcodeadas
- Verificación de TypeScript en frontend
- Verificación de SQLite
- Verificación de protección SQL Injection
- Verificación de hashing de contraseñas
- Verificación de HTTPS/wss
- Verificación de Docker
- Verificación de restricciones de IA
- Verificación de estructura SPA

**Uso:**
```bash
./scripts/check-rules.sh
# o
pnpm check:rules
```

### `check-security.sh`
Verificación específica de seguridad:
- Protección de .env
- Búsqueda de contraseñas en texto plano
- Verificación de hashing de contraseñas
- Protección contra SQL Injection
- Protección contra XSS
- Verificación de HTTPS/wss
- Validación de entrada de usuario

**Uso:**
```bash
./scripts/check-security.sh
# o
pnpm check:security
```

### `check-technologies.sh`
Verificación de tecnologías usadas:
- TypeScript en frontend
- SQLite (si hay módulo Database)
- Fastify (si hay módulo Framework)
- Tailwind CSS (si hay módulo FrontEnd)
- Docker
- Versión de Node.js

**Uso:**
```bash
./scripts/check-technologies.sh
# o
pnpm check:tech
```

## Comandos NPM/Pnpm

Todos los scripts pueden ejecutarse usando pnpm:

```bash
# Verificar todas las reglas
pnpm check

# Verificar reglas específicas
pnpm check:rules      # Todas las reglas
pnpm check:security   # Solo seguridad
pnpm check:tech       # Solo tecnologías

# Verificar todo
pnpm check:all       # Ejecuta todos los checks
```

## Salida

Los scripts muestran:
- ✅ **Verde**: Todo está bien
- ⚠️ **Amarillo**: Warnings (revisar manualmente)
- ❌ **Rojo**: Errores críticos (deben corregirse)

Al final se muestra un resumen con el número de errores y warnings encontrados.

## Notas

- Los scripts buscan patrones comunes pero pueden tener falsos positivos
- Siempre revisar manualmente los warnings
- Los errores críticos deben corregirse antes de continuar
- Los scripts excluyen `node_modules`, `dist`, y `.git` automáticamente

## Integración con CI/CD

Puedes integrar estos scripts en tu pipeline de CI/CD:

```yaml
# Ejemplo para GitHub Actions
- name: Check project rules
  run: pnpm check:all
```


