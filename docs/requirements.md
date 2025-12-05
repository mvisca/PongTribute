# Requisitos del Proyecto ft_transcendence

## Resumen del Proyecto

Este proyecto consiste en crear un sitio web para el juego Pong con capacidades de multijugador en tiempo real. El proyecto incluye una parte obligatoria y módulos adicionales que se pueden elegir.

**Versión del Subject: 18.0**

## Parte Obligatoria (25% del proyecto)

### IV.1 Overview

- Sitio web con interfaz de usuario
- Capacidades de multijugador en tiempo real
- Permite jugar Pong con amigos

### IV.2 Requisitos Técnicos Mínimos

#### Backend
- **Opcional**: Puede desarrollarse con o sin backend
- **Si hay backend**: Debe estar escrito en **PHP puro sin frameworks**
  - Esta restricción puede ser sobrescrita por el módulo Framework
- **Si usa base de datos**: Debe seguir las restricciones del módulo Database

#### Frontend
- Debe desarrollarse usando **TypeScript** como código base
  - Esta restricción puede ser modificada por el módulo FrontEnd

#### Aplicación Web
- Debe ser una **Single Page Application (SPA)**
- El usuario debe poder usar los botones **Back** y **Forward** del navegador
- Debe ser compatible con la **última versión estable actualizada de Mozilla Firefox**
- No debe haber errores o advertencias sin manejar al navegar

#### Docker
- **OBLIGATORIO**: Usar Docker para ejecutar el sitio web
- Todo debe lanzarse con un **único comando** para ejecutar un contenedor autónomo

**Nota sobre contenedores rootless:**
- El runtime debe estar en `/goinfre` o `/sgoinfre`
- No se pueden usar "bind-mount volumes" entre host y contenedor si se usan UIDs no-root
- Estrategias alternativas: contenedor en VM, reconstruir contenedor después de cambios, crear imagen propia con root como único UID

### IV.3 Juego

#### Funcionalidades Requeridas
- **Juego en vivo**: Los usuarios deben poder participar en un juego Pong en vivo contra otro jugador directamente en el sitio web
  - Ambos jugadores usarán el mismo teclado (por defecto)
  - El módulo Remote players puede mejorar esto con jugadores remotos

- **Sistema de torneo**: 
  - Un jugador debe poder jugar contra otro
  - Debe haber un sistema de torneo disponible
  - El torneo consistirá en múltiples jugadores que pueden turnarse jugando entre sí
  - Debe mostrar claramente quién juega contra quién y el orden de juego

- **Sistema de registro**:
  - Al inicio de un torneo, cada jugador debe ingresar su alias
  - Los alias se reinician cuando comienza un nuevo torneo
  - Esta restricción puede ser modificada usando el módulo Standard User Management
  - **Nota**: Esto NO implica creación de cuentas de usuario

- **Sistema de matchmaking**:
  - El sistema de torneo debe organizar el matchmaking de los participantes
  - Debe anunciar el próximo partido

- **Reglas del juego**:
  - Todos los jugadores deben adherirse a las mismas reglas
  - Velocidad de paleta idéntica para todos
  - Esto también aplica cuando se usa IA; la IA debe exhibir la misma velocidad que un jugador regular

- **Visualización**:
  - El juego debe adherirse a las restricciones de frontend por defecto, o usar el módulo FrontEnd, o sobrescribirlo con el módulo Graphics
  - La estética visual puede variar, pero el juego debe capturar la esencia del Pong original (1972)

- **Sistema de torneo**:
  - Debe funcionar con o sin registro de usuarios
  - Sin el módulo Standard User Management: entrada manual de alias
  - Con el módulo: los alias están vinculados a cuentas registradas, permitiendo estadísticas persistentes y listas de amigos

### IV.4 Preocupaciones de Seguridad

#### Requisitos Obligatorios
- **Contraseñas**: Cualquier contraseña almacenada en la base de datos debe estar **hasheada**
  - Usar un algoritmo de hashing de contraseñas fuerte

- **Protección contra ataques**:
  - Protección contra **inyecciones SQL**
  - Protección contra ataques **XSS**

- **HTTPS**:
  - Si hay backend u otras características, es **obligatorio** habilitar conexión **HTTPS** para todos los aspectos
  - Usar **wss** en lugar de **ws** para WebSockets

- **Validación**:
  - Implementar mecanismos de validación para formularios y cualquier entrada de usuario
  - Validación en el lado del cliente (página base) si no hay backend
  - Validación en el lado del servidor si hay backend

- **Protección de rutas**:
  - Si se crea una API, asegurar que las rutas estén protegidas
  - Incluso sin usar tokens JWT, la seguridad del sitio sigue siendo crítica

#### Gestión de Credenciales
- **OBLIGATORIO**: Cualquier credencial, API key, variable de entorno, etc., debe guardarse localmente en un archivo **.env** e **ignorado por git**
- **Las credenciales almacenadas públicamente causarán que el proyecto falle**

## Módulos (75% restante del proyecto)

Para alcanzar el **100% de completitud del proyecto**, se requiere un **mínimo de 7 módulos principales**.

**Regla importante**: Dos módulos menores cuentan como un módulo principal.

### Resumen de Módulos Disponibles

#### Web
- **Mayor**: Usar un framework para construir el backend (Fastify con Node.js)
- **Menor**: Usar un framework o toolkit para construir el frontend (Tailwind CSS)
- **Menor**: Usar una base de datos para el backend (SQLite)
- **Mayor**: Almacenar el score de un torneo en Blockchain (Avalanche + Solidity)

#### User Management
- **Mayor**: Gestión estándar de usuarios, autenticación, usuarios a través de torneos
- **Mayor**: Implementar autenticación remota (OAuth 2.0)

#### Gameplay and User Experience
- **Mayor**: Jugadores remotos
- **Mayor**: Multijugador (más de 2 jugadores en el mismo juego)
- **Mayor**: Agregar otro juego con historial de usuario y matchmaking
- **Menor**: Opciones de personalización del juego
- **Mayor**: Chat en vivo

#### AI-Algo
- **Mayor**: Introducir un oponente de IA
- **Menor**: Dashboards de estadísticas de usuario y juego

#### Cybersecurity
- **Mayor**: Implementar WAF/ModSecurity con configuración endurecida y HashiCorp Vault para gestión de secretos
- **Menor**: Opciones de cumplimiento GDPR con anonimización de usuarios, gestión de datos local y eliminación de cuenta
- **Mayor**: Implementar Autenticación de Dos Factores (2FA) y JWT

#### Devops
- **Mayor**: Configuración de infraestructura para gestión de logs (ELK Stack)
- **Menor**: Sistema de monitoreo (Prometheus/Grafana)
- **Mayor**: Diseñar el backend como microservicios

#### Graphics
- **Mayor**: Usar técnicas avanzadas de 3D (Babylon.js)

#### Accessibility
- **Menor**: Soporte en todos los dispositivos
- **Menor**: Expandir compatibilidad de navegadores
- **Menor**: Soporte para múltiples idiomas (mínimo 3)
- **Menor**: Agregar características de accesibilidad para usuarios con discapacidad visual
- **Menor**: Integración de Server-Side Rendering (SSR)

#### Server-Side Pong
- **Mayor**: Reemplazar Pong básico con Pong del lado del servidor e implementar una API
- **Mayor**: Habilitar gameplay de Pong vía CLI contra usuarios web con integración de API

## Parte Bonus

- **5 puntos** por cada módulo menor
- **10 puntos** por cada módulo mayor

**IMPORTANTE**: La parte bonus solo será evaluada si la parte obligatoria es **PERFECTA**. "Perfecto" significa que la parte obligatoria ha sido completada completamente y funciona sin problemas.

## Evaluación

- Durante la evaluación, puede solicitarse una breve modificación del proyecto
- Esto puede involucrar un cambio menor de comportamiento, algunas líneas de código para escribir o reescribir, o una característica fácil de agregar
- El objetivo es verificar la comprensión real de una parte específica del proyecto
- La modificación debe ser factible en unos pocos minutos


