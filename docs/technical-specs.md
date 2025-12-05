# Especificaciones Técnicas - ft_transcendence

## Stack Tecnológico

### Tecnologías Obligatorias (Base)

#### Backend (Opcional)
- **Lenguaje**: PHP puro (sin frameworks)
  - **Alternativa con módulo**: Fastify con Node.js (módulo Framework)

#### Frontend
- **Lenguaje base**: TypeScript
  - **Con módulo FrontEnd**: TypeScript + Tailwind CSS (nada más)

#### Base de Datos
- **Con módulo Database**: SQLite (obligatorio para todas las instancias de DB en el proyecto)

#### Contenedores
- **Docker**: Obligatorio para ejecutar el sitio web
- **Requisito**: Un solo comando para lanzar todo

### Tecnologías por Módulo

#### Web Framework Module
- **Backend Framework**: Fastify con Node.js
- **Frontend Framework**: Tailwind CSS (además de TypeScript)

#### Blockchain Module
- **Blockchain**: Avalanche (testing blockchain)
- **Lenguaje de Smart Contracts**: Solidity

#### Graphics Module
- **3D Engine**: Babylon.js

#### Authentication Module
- **Protocolo**: OAuth 2.0
- **Proveedores**: Cualquier proveedor compatible con OAuth (Google, GitHub, etc.)

#### Cybersecurity Module
- **WAF**: ModSecurity con configuración endurecida
- **Secrets Management**: HashiCorp Vault
- **2FA**: Implementación de Two-Factor Authentication
- **Tokens**: JWT (JSON Web Tokens)

#### DevOps Modules
- **Log Management**: ELK Stack
  - Elasticsearch
  - Logstash
  - Kibana
- **Monitoring**: Prometheus + Grafana

#### Server-Side Pong
- **API**: RESTful API para interacción con el juego
- **CLI**: Interfaz de línea de comandos para jugar contra usuarios web

## Requisitos de Compatibilidad

### Navegadores
- **Obligatorio**: Última versión estable actualizada de Mozilla Firefox
- **Con módulo**: Soporte para navegador adicional

### Dispositivos
- **Con módulo Accessibility**: Soporte en todos los dispositivos (responsive)
  - Desktop
  - Laptop
  - Tablet
  - Smartphone

## Arquitectura

### Aplicación Web
- **Tipo**: Single Page Application (SPA)
- **Navegación**: Debe soportar botones Back/Forward del navegador
- **Rendering**: 
  - Por defecto: Client-side rendering
  - Con módulo: Server-Side Rendering (SSR)

### Backend (si se implementa)
- **Arquitectura por defecto**: Monolítica
- **Con módulo Microservices**: Backend dividido en microservicios
  - Comunicación: RESTful APIs o message queues
  - Cada microservicio: Responsable de una tarea específica

### Base de Datos
- **Con módulo Database**: SQLite
- **Ubicación**: Todas las instancias de DB deben usar SQLite

## Seguridad

### Protocolos
- **HTTPS**: Obligatorio si hay backend
- **WebSockets**: wss (WebSocket Secure) en lugar de ws

### Protecciones Requeridas
- **SQL Injection**: Protección obligatoria
- **XSS**: Protección obligatoria
- **Password Hashing**: Algoritmo fuerte (obligatorio)
- **Validación**: 
  - Lado del cliente (si no hay backend)
  - Lado del servidor (si hay backend)

### Gestión de Secretos
- **Archivo .env**: Obligatorio para credenciales, API keys, variables de entorno
- **Git**: El archivo .env debe estar en .gitignore
- **HashiCorp Vault**: Con módulo Cybersecurity

## Docker

### Requisitos
- **Un solo comando**: Para lanzar todo el proyecto
- **Contenedor autónomo**: Todo debe ejecutarse dentro del contenedor

### Consideraciones Rootless
Si el contenedor se ejecuta en modo rootless:
- **Runtime**: Debe estar en `/goinfre` o `/sgoinfre`
- **Bind-mount volumes**: No disponibles si se usan UIDs no-root
- **Estrategias alternativas**:
  - Contenedor en máquina virtual
  - Reconstruir contenedor después de cambios
  - Crear imagen propia con root como único UID

## Juego Pong

### Reglas del Juego
- **Velocidad de paleta**: Idéntica para todos los jugadores
- **IA**: Debe tener la misma velocidad que un jugador regular
- **Esencia**: Debe capturar la esencia del Pong original (1972)

### Modos de Juego
- **Local**: Dos jugadores en el mismo teclado (obligatorio)
- **Remoto**: Dos jugadores en computadoras separadas (módulo Remote players)
- **Multijugador**: Más de 2 jugadores (módulo Multiplayer)
- **IA**: Oponente de IA (módulo AI-Algo)

### Sistema de Torneo
- **Matchmaking**: Organización automática de partidos
- **Anuncios**: Mostrar próximo partido
- **Registro**: Sistema de aliases (manual o vinculado a cuentas)

## API (con módulo Server-Side Pong)

### Endpoints Requeridos
- Inicialización del juego
- Controles del jugador
- Actualizaciones del estado del juego
- Autenticación (para CLI)

### Integración
- **Web**: Interfaz web para jugar
- **CLI**: Interfaz de línea de comandos para jugar contra usuarios web

## Logging y Monitoreo

### Log Management (módulo ELK)
- **Elasticsearch**: Almacenamiento e indexación de logs
- **Logstash**: Recolección y procesamiento de logs
- **Kibana**: Visualización de logs y dashboards

### Monitoring (módulo Monitoring)
- **Prometheus**: Recolección de métricas
- **Grafana**: Visualización de métricas y dashboards
- **Alertas**: Reglas de alerta en Prometheus

## Accesibilidad

### Características (con módulos)
- **Idiomas**: Mínimo 3 idiomas soportados
- **Screen Readers**: Soporte para lectores de pantalla
- **Navegación por teclado**: Gestión de foco y navegación
- **Contraste**: Esquema de colores de alto contraste
- **Tamaño de texto**: Opciones para ajustar tamaño de texto
- **Alt text**: Texto alternativo descriptivo para imágenes

## Blockchain (módulo Blockchain)

### Configuración
- **Blockchain**: Avalanche (entorno de testing)
- **Smart Contracts**: Solidity
- **Propósito**: Almacenar scores de torneos de forma inmutable

### Integración
- Puede tener dependencias con el módulo Backend Framework
- Requiere ajustes en el backend para interactuar con la blockchain


