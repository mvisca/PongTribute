# Documentación del Proyecto ft_transcendence

Esta carpeta contiene la documentación estructurada del proyecto ft_transcendence, extraída y organizada del PDF del subject.

## 📚 Archivos de Documentación

### [requirements.md](./requirements.md)
Contiene todos los requisitos del proyecto:
- Parte obligatoria (25% del proyecto)
- Requisitos técnicos mínimos
- Requisitos del juego
- Preocupaciones de seguridad
- Resumen de módulos disponibles
- Información sobre bonus y evaluación

### [technical-specs.md](./technical-specs.md)
Especificaciones técnicas detalladas:
- Stack tecnológico (obligatorio y por módulos)
- Requisitos de compatibilidad
- Arquitectura del proyecto
- Especificaciones de seguridad
- Configuración de Docker
- Detalles de implementación

### [rules-constraints.md](./rules-constraints.md)
Reglas y restricciones críticas del proyecto:
- Reglas sobre uso de librerías (MUY IMPORTANTE)
- Restricciones técnicas
- Restricciones del juego
- Restricciones de seguridad
- Restricciones de módulos
- Restricciones de evaluación

### [modules-overview.md](./modules-overview.md)
Resumen detallado de todos los módulos disponibles:
- Descripción de cada módulo
- Características requeridas
- Tecnologías específicas
- Dependencias entre módulos
- Notas importantes

## 📄 Archivo Original

- **subject_ft_trasnceder.pdf**: PDF original del subject
- **subject_ft_transcendence.txt**: Versión de texto extraída del PDF

## 🚀 Uso Rápido

### Para empezar el proyecto:
1. Lee [requirements.md](./requirements.md) para entender los requisitos obligatorios
2. Revisa [rules-constraints.md](./rules-constraints.md) para las reglas críticas
3. Consulta [technical-specs.md](./technical-specs.md) para las especificaciones técnicas
4. Explora [modules-overview.md](./modules-overview.md) para elegir módulos

## 🐳 Docker (arranque con un solo comando)

### Requisitos
- Docker + Docker Compose

### Variables de entorno
Este repo usa un `.env` **local** (ignorado por Git). Para generar uno:

```bash
cp env.docker.example .env
```

Luego reemplaza los placeholders `REPLACE_WITH_REAL_VALUE_FROM_ENV_OLD` por tus valores reales (por ejemplo desde `.env_old`).

### Levantar todo

```bash
docker compose up --build -d
```

### URLs útiles
- **App (frontend + HTTPS)**: `https://localhost/`
- **Swagger (Gateway agregador)**: `https://localhost/docs`
- **OpenAPI JSON (agregador)**:
  - `https://localhost/docs/auth.json`
  - `https://localhost/docs/user.json`
  - `https://localhost/docs/game.json`
- **WebSocket (Nginx -> Game)**: `wss://localhost/api/game/ws?matchId=<uuid>&token=<jwt>`

### Nota sobre el certificado
En dev, el contenedor `nginx` genera un certificado **self‑signed** si no existe uno en `packages/nginx/certs/`.
El navegador mostrará “No es seguro”; acepta la excepción para `https://localhost`.

### Antes de elegir módulos:
⚠️ **IMPORTANTE**: Lee todo el subject antes de elegir módulos. Algunos módulos pueden depender de otros o entrar en conflicto.

### Reglas críticas a recordar:
- ❌ No usar librerías que resuelvan un módulo completo
- ✅ Usar librerías pequeñas para subcomponentes está permitido
- 🔒 Credenciales en `.env` (nunca en git)
- 🐳 Docker obligatorio (un solo comando)
- 🔐 Seguridad obligatoria (HTTPS, protección SQL/XSS, hashing de contraseñas)

## 📊 Estructura del Proyecto

- **Parte Obligatoria**: 25% del proyecto
- **Módulos**: 75% restante
- **Módulos principales requeridos**: Mínimo 7 para 100%
- **Conversión**: 2 módulos menores = 1 módulo principal

## 🔍 Búsqueda Rápida

### ¿Necesitas saber sobre...?

- **Requisitos obligatorios**: Ver [requirements.md](./requirements.md) sección "Parte Obligatoria"
- **Qué tecnologías usar**: Ver [technical-specs.md](./technical-specs.md)
- **Qué librerías puedo usar**: Ver [rules-constraints.md](./rules-constraints.md) sección "Uso de Librerías"
- **Detalles de un módulo específico**: Ver [modules-overview.md](./modules-overview.md)
- **Reglas de seguridad**: Ver [rules-constraints.md](./rules-constraints.md) sección "Restricciones de Seguridad"

## 📝 Notas

Esta documentación fue generada automáticamente a partir del PDF del subject (versión 18.0). Si encuentras discrepancias o necesitas más detalles, consulta el PDF original.

---

**Versión del Subject**: 18.0  
**Fecha de extracción**: Generada automáticamente


