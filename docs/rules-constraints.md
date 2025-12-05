# Reglas y Restricciones - ft_transcendence

## ⚠️ Reglas Críticas del Proyecto

### Uso de Librerías y Herramientas

Estas reglas se aplican a **TODO** el proyecto y son **MUY IMPORTANTES**:

#### ❌ PROHIBIDO
- **Usar librerías o herramientas que proporcionen una solución inmediata y completa para una característica o módulo completo**
  - Ejemplo: No usar una librería que implemente todo el sistema de autenticación OAuth
  - Ejemplo: No usar un framework de juego completo que implemente Pong

#### ✅ PERMITIDO
- **Usar una librería pequeña o herramienta que resuelva una tarea simple y única que represente un subcomponente de una característica o módulo más grande**
  - Ejemplo: Usar una librería para hashing de contraseñas (bcrypt)
  - Ejemplo: Usar una librería para validación de formularios

#### 📋 Instrucciones Directas
- **Cualquier instrucción directa sobre el uso (puede, debe, no puede) de una librería o herramienta de terceros DEBE seguirse**

#### 🔍 Justificación Durante Evaluación
- **Durante la evaluación, el equipo debe justificar cualquier uso de librería o herramienta que:**
  - No esté explícitamente aprobada por las guías del proyecto
  - No esté en contradicción con las restricciones del proyecto

- **Durante la evaluación, el evaluador determinará si:**
  - El uso de una librería específica es legítimo (y permitido)
  - O si esencialmente resuelve una característica o módulo completo (y por lo tanto está prohibido)

## Restricciones Técnicas

### Backend

#### Por Defecto (Sin Módulo Framework)
- **PHP puro sin frameworks**
- No se pueden usar frameworks como Laravel, Symfony, etc.

#### Con Módulo Framework
- **Fastify con Node.js** (obligatorio)
- No se puede usar otro framework

### Frontend

#### Por Defecto
- **TypeScript** como código base
- No se pueden usar frameworks como React, Vue, Angular (a menos que el módulo lo permita)

#### Con Módulo FrontEnd
- **TypeScript + Tailwind CSS** (nada más)
- No se pueden usar otros frameworks CSS o de UI

### Base de Datos

#### Con Módulo Database
- **SQLite** es obligatorio para todas las instancias de DB
- No se pueden usar otras bases de datos (MySQL, PostgreSQL, MongoDB, etc.)

### Docker

#### Obligatorio
- **Docker** debe usarse para ejecutar el sitio web
- **Un solo comando** para lanzar todo
- Todo debe ejecutarse en un contenedor autónomo

## Restricciones del Juego

### Velocidad y Reglas
- **Velocidad de paleta**: Debe ser idéntica para todos los jugadores
- **IA**: Debe tener la misma velocidad que un jugador regular
- **Reglas**: Todos los jugadores deben adherirse a las mismas reglas

### IA (Módulo AI-Algo)
- **A* Algorithm**: **PROHIBIDO** para la IA
- **Comportamiento humano**: La IA debe replicar el comportamiento humano
- **Simulación de teclado**: La IA debe simular entrada de teclado
- **Refresco de vista**: La IA solo puede refrescar su vista del juego una vez por segundo
- **Anticipación**: La IA debe anticipar rebotes y otras acciones
- **Power-ups**: Si se implementa el módulo de personalización, la IA debe usar power-ups
- **Capacidad de ganar**: La IA debe tener la capacidad de ganar ocasionalmente
- **Explicación**: Debes explicar en detalle cómo funciona tu IA durante la evaluación
- **Prohibido**: Crear una IA que no haga nada está estrictamente prohibido

### Visualización
- **Esencia del Pong original (1972)**: Debe capturarse
- La estética visual puede variar, pero la esencia del juego debe mantenerse

## Restricciones de Seguridad

### Credenciales
- **Archivo .env**: Obligatorio para todas las credenciales, API keys, variables de entorno
- **Git**: El archivo .env DEBE estar en .gitignore
- **Fallo del proyecto**: Las credenciales almacenadas públicamente causarán que el proyecto falle

### Contraseñas
- **Hashing**: Obligatorio para cualquier contraseña almacenada
- **Algoritmo fuerte**: Debe usarse un algoritmo de hashing de contraseñas fuerte

### Protecciones Obligatorias
- **SQL Injection**: Protección obligatoria
- **XSS**: Protección obligatoria
- **HTTPS**: Obligatorio si hay backend (wss para WebSockets)

### Validación
- **Formularios**: Validación obligatoria
- **Entrada de usuario**: Validación obligatoria
- **Lado del cliente**: Si no hay backend
- **Lado del servidor**: Si hay backend

## Restricciones de Módulos

### Módulos Mínimos
- **7 módulos principales** requeridos para 100% de completitud
- **2 módulos menores = 1 módulo principal**

### Dependencias entre Módulos
- Algunos módulos pueden depender de otros
- Algunos módulos pueden entrar en conflicto con otros
- **IMPORTANTE**: Leer todo el subject antes de elegir módulos

### Bonus
- **Solo se evalúa si la parte obligatoria es PERFECTA**
- "Perfecto" significa completado completamente y funcionando sin problemas

## Restricciones de Evaluación

### Modificaciones Durante Evaluación
- Puede solicitarse una **breve modificación** del proyecto
- Puede involucrar:
  - Cambio menor de comportamiento
  - Algunas líneas de código para escribir o reescribir
  - Característica fácil de agregar
- **Propósito**: Verificar comprensión real de una parte específica
- **Tiempo**: Debe ser factible en unos pocos minutos

### Entorno de Desarrollo
- La modificación puede realizarse en cualquier entorno de desarrollo que elijas
- Debe ser factible en el tiempo especificado

## Restricciones de Compatibilidad

### Navegadores
- **Mozilla Firefox**: Última versión estable actualizada (obligatorio)
- Otros navegadores: Opcionales pero recomendados

### Errores
- **Sin errores sin manejar**: No debe haber errores o advertencias sin manejar al navegar
- **Sin warnings**: El sitio debe funcionar sin warnings en la consola

### Navegación
- **Back/Forward**: Debe funcionar correctamente en una SPA

## Restricciones de Arquitectura

### Single Page Application
- **SPA obligatorio**: El sitio debe ser una Single Page Application
- **Navegación**: Debe soportar botones Back/Forward del navegador

### Microservicios (con módulo)
- **Comunicación**: RESTful APIs o message queues
- **Responsabilidad única**: Cada microservicio debe ser responsable de una tarea específica
- **Límites claros**: Deben definirse límites e interfaces claros entre microservicios

## Restricciones de Usuario

### Gestión de Duplicados
- **Usernames/Emails duplicados**: La gestión está a tu discreción
- **Solución lógica**: Debe proporcionarse una solución lógica

### Sistema de Torneo
- **Funcionamiento**: Debe funcionar con o sin registro de usuarios
- **Sin módulo User Management**: Entrada manual de alias
- **Con módulo User Management**: Aliases vinculados a cuentas registradas

## Restricciones de Blockchain (módulo)

### Entorno
- **Testing blockchain**: Debe usarse un entorno de testing blockchain
- **Avalanche**: Blockchain elegida (obligatorio)
- **Solidity**: Lenguaje para smart contracts (obligatorio)

## Restricciones de Accesibilidad (módulos)

### Idiomas
- **Mínimo 3 idiomas**: Si se implementa el módulo de múltiples idiomas

### Características de Accesibilidad
- **Screen readers**: Soporte obligatorio
- **Alt text**: Texto alternativo descriptivo para imágenes
- **Navegación por teclado**: Gestión de foco obligatoria
- **Contraste**: Esquema de colores de alto contraste

## Restricciones de GDPR (módulo)

### Características Requeridas
- **Anonimización**: Opción para anonimizar datos de usuario
- **Gestión de datos local**: Herramientas para ver, editar o eliminar información personal
- **Eliminación de cuenta**: Proceso para eliminar permanentemente cuentas y datos asociados
- **Comunicación clara**: Comunicación transparente sobre derechos de privacidad de datos

## Restricciones de Chat (módulo)

### Características Requeridas
- **Mensajes directos**: Usuario debe poder enviar mensajes directos a otros usuarios
- **Bloqueo**: Usuario debe poder bloquear otros usuarios
- **Invitaciones**: Usuario debe poder invitar otros usuarios a jugar Pong a través del chat
- **Notificaciones**: El sistema de torneo debe poder notificar a usuarios sobre el próximo juego
- **Perfiles**: Usuario debe poder acceder a perfiles de otros jugadores a través del chat

## Restricciones de Remote Players (módulo)

### Consideraciones de Red
- **Desconexiones inesperadas**: Deben manejarse
- **Lag**: Debe manejarse
- **Mejor experiencia de usuario posible**: Debe ofrecerse

## Restricciones de Multiplayer (módulo)

### Número de Jugadores
- **Más de 2 jugadores**: Debe ser posible
- **Control en vivo**: Cada jugador necesita control en vivo
- **Módulo Remote players**: Fuertemente recomendado

### Diseño del Juego
- **Flexibilidad**: Puedes decidir cómo se juega con 3, 4, 5, 6 o más jugadores
- **Ejemplo**: 4 jugadores podrían jugar en un tablero cuadrado, cada uno controlando un lado único del cuadrado

## Restricciones de Nuevo Juego (módulo)

### Características Requeridas
- **Juego distinto de Pong**: Debe ser un juego nuevo y diferente
- **Historial de usuario**: Debe implementarse
- **Matchmaking**: Debe implementarse
- **Almacenamiento seguro**: Los datos deben almacenarse de forma segura
- **Actualización**: Los datos deben mantenerse actualizados

## Restricciones de Estadísticas (módulo)

### Dashboards Requeridos
- **Dashboard de usuario**: Estadísticas individuales
- **Dashboard de juego**: Estadísticas de sesiones de juego
- **Visualización**: Técnicas de visualización de datos (gráficos, etc.)
- **Métricas**: Puedes agregar cualquier métrica que consideres útil

## Restricciones de Server-Side Pong (módulos)

### API
- **Endpoints requeridos**:
  - Inicialización del juego
  - Controles del jugador
  - Actualizaciones del estado del juego

### CLI
- **Autenticación**: Mecanismo de autenticación dentro del CLI
- **Sincronización en tiempo real**: Entre CLI y usuarios web
- **Unificación**: CLI y usuarios web deben poder jugar juntos

### Dependencia
- **Módulo anterior**: Se recomienda fuertemente hacer el módulo anterior primero (Replace Basic Pong with Server-Side Pong)


