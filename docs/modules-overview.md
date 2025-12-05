# Resumen de Módulos - ft_transcendence

## 📊 Resumen General

- **Módulos principales requeridos**: Mínimo 7 para 100% de completitud
- **Conversión**: 2 módulos menores = 1 módulo principal
- **Parte obligatoria**: 25% del proyecto
- **Módulos**: 75% restante del proyecto

## 🌐 Web

### Major: Framework para Backend
**Tecnología**: Fastify con Node.js

**Descripción**: 
- Usar un framework específico para desarrollo backend
- Fastify con Node.js es obligatorio
- Puedes crear el backend sin este módulo usando PHP puro, pero el módulo solo será válido si sigues sus requisitos

**Notas**:
- Puede tener dependencias con otros módulos (como Database)
- Puede requerir ajustes para integración con blockchain (si se implementa)

### Minor: Framework o Toolkit para Frontend
**Tecnología**: Tailwind CSS (además de TypeScript)

**Descripción**:
- El desarrollo frontend debe usar Tailwind CSS además de TypeScript
- Nada más (no otros frameworks CSS o de UI)
- Puedes crear el frontend sin este módulo usando las directivas por defecto, pero el módulo solo será válido si sigues sus requisitos

### Minor: Base de Datos para Backend
**Tecnología**: SQLite

**Descripción**:
- La base de datos designada para todas las instancias de DB en el proyecto es SQLite
- Asegura consistencia de datos y compatibilidad en todos los componentes del proyecto
- Puede ser un prerrequisito para otros módulos, como el módulo Backend Framework

**Importante**: SQLite es obligatorio para TODAS las instancias de base de datos

### Major: Almacenar Scores en Blockchain
**Tecnologías**: Avalanche + Solidity

**Descripción**:
- Implementar una característica para almacenar scores de torneos de forma segura en blockchain
- Usar un entorno de testing blockchain para desarrollo y pruebas
- Blockchain elegida: Avalanche
- Lenguaje: Solidity para smart contracts

**Características**:
- Integración de blockchain (Avalanche) en el sitio web Pong
- Desarrollo de smart contracts en Solidity
- Almacenamiento inmutable y transparente de scores de torneos
- Uso de testing blockchain (no blockchain en vivo)

**Dependencias**:
- Puede tener dependencias con el módulo Backend Framework
- Puede requerir ajustes en el backend para interactuar con la blockchain

## 👥 User Management

### Major: Gestión Estándar de Usuarios
**Descripción**: Sistema completo de gestión de usuarios, autenticación y usuarios a través de torneos

**Características requeridas**:
- ✅ Usuarios pueden suscribirse al sitio web de forma segura
- ✅ Usuarios registrados pueden iniciar sesión de forma segura
- ✅ Usuarios pueden seleccionar un nombre de visualización único para participar en torneos
- ✅ Usuarios pueden actualizar su información
- ✅ Usuarios pueden subir un avatar, con opción por defecto si no se proporciona
- ✅ Usuarios pueden agregar otros como amigos y ver su estado en línea
- ✅ Perfiles de usuario muestran estadísticas (victorias y derrotas)
- ✅ Cada usuario tiene un Historial de Partidos incluyendo juegos 1v1, fechas y detalles relevantes, accesible para usuarios que han iniciado sesión

**Gestión de duplicados**:
- La gestión de usernames/emails duplicados está a tu discreción
- Debe proporcionarse una solución lógica

**Nota**: Este módulo extiende la lógica del torneo; no la reemplaza

### Major: Autenticación Remota
**Tecnología**: OAuth 2.0

**Descripción**:
- Implementar un sistema de autenticación externo seguro usando OAuth 2.0
- Libre elección de proveedor compatible con OAuth (Google, GitHub, etc.)

**Características**:
- Integración del sistema de autenticación, permitiendo a usuarios iniciar sesión de forma segura
- Obtener credenciales y permisos necesarios de la autoridad para habilitar inicio de sesión seguro
- Implementar flujos de inicio de sesión y autorización fáciles de usar que sigan mejores prácticas y estándares de seguridad
- Asegurar intercambio seguro de tokens de autenticación e información de usuario entre la aplicación web y el proveedor de autenticación

## 🎮 Gameplay and User Experience

### Major: Jugadores Remotos
**Descripción**: Permitir que dos jugadores jueguen remotamente desde computadoras separadas

**Características**:
- Dos jugadores pueden jugar remotamente
- Cada jugador está en una computadora separada
- Acceden al mismo sitio web y juegan el mismo juego Pong

**Consideraciones importantes**:
- Manejar problemas de red (desconexiones inesperadas, lag)
- Ofrecer la mejor experiencia de usuario posible

### Major: Multijugador (Más de 2 jugadores)
**Descripción**: Permitir más de 2 jugadores en el mismo juego

**Características**:
- Más de 2 jugadores pueden jugar en el mismo juego
- Cada jugador necesita control en vivo
- El módulo Remote players es fuertemente recomendado

**Flexibilidad**:
- Puedes decidir cómo se juega con 3, 4, 5, 6 o más jugadores
- Ejemplo: 4 jugadores podrían jugar en un tablero cuadrado, cada uno controlando un lado único del cuadrado

### Major: Agregar Otro Juego
**Descripción**: Introducir un nuevo juego distinto de Pong con historial de usuario y matchmaking

**Características**:
- Desarrollar un nuevo juego atractivo distinto de Pong
- Implementar seguimiento de historial de usuario para registrar y mostrar estadísticas de juego individuales
- Crear un sistema de matchmaking para permitir a usuarios encontrar oponentes y participar en partidos justos y equilibrados
- Asegurar que el historial de juego y los datos de matchmaking se almacenen de forma segura y se mantengan actualizados
- Optimizar el rendimiento y la capacidad de respuesta del nuevo juego

### Minor: Opciones de Personalización del Juego
**Descripción**: Proporcionar opciones de personalización para todos los juegos disponibles

**Características**:
- Ofrecer características de personalización (power-ups, ataques, mapas diferentes)
- Permitir a usuarios elegir una versión por defecto del juego con características básicas
- Asegurar que las opciones de personalización estén disponibles y sean aplicables a todos los juegos ofrecidos
- Implementar menús o interfaces de configuración fáciles de usar
- Mantener consistencia en características de personalización en todos los juegos

**Nota para IA**: Si se implementa este módulo, la IA debe usar power-ups

### Major: Chat en Vivo
**Descripción**: Crear una característica de chat para usuarios

**Características requeridas**:
- ✅ Usuario debe poder enviar mensajes directos a otros usuarios
- ✅ Usuario debe poder bloquear otros usuarios, impidiendo que vean más mensajes de la cuenta bloqueada
- ✅ Usuario debe poder invitar otros usuarios a jugar un juego Pong a través de la interfaz de chat
- ✅ El sistema de torneo debe poder notificar a usuarios sobre el próximo juego
- ✅ Usuario debe poder acceder a perfiles de otros jugadores a través de la interfaz de chat

## 🤖 AI-Algo

### Major: Introducir un Oponente de IA
**Descripción**: Incorporar un jugador de IA en el juego

**Restricciones importantes**:
- ❌ **A* Algorithm está PROHIBIDO**
- ✅ La IA debe replicar comportamiento humano
- ✅ La IA debe simular entrada de teclado
- ✅ La IA solo puede refrescar su vista del juego una vez por segundo
- ✅ La IA debe anticipar rebotes y otras acciones
- ✅ Si se implementa el módulo de personalización, la IA debe usar power-ups
- ✅ La IA debe tener la capacidad de ganar ocasionalmente
- ❌ Crear una IA que no haga nada está estrictamente prohibido

**Evaluación**:
- Debes explicar en detalle cómo funciona tu IA durante la evaluación

**Objetivos**:
- Desarrollar un oponente de IA que proporcione una experiencia de juego desafiante y atractiva
- Implementar lógica de IA y procesos de toma de decisiones
- Explorar algoritmos y técnicas alternativas sin depender de A*

### Minor: Dashboards de Estadísticas de Usuario y Juego
**Descripción**: Introducir dashboards que muestren estadísticas para usuarios individuales y sesiones de juego

**Características**:
- Crear dashboards fáciles de usar que proporcionen a usuarios información sobre sus estadísticas de juego
- Desarrollar un dashboard separado para sesiones de juego, mostrando estadísticas detalladas, resultados e datos históricos para cada partido
- Asegurar que los dashboards ofrezcan una interfaz de usuario intuitiva e informativa
- Implementar técnicas de visualización de datos (gráficos, etc.)
- Permitir a usuarios acceder y explorar su propio historial de juego y métricas de rendimiento
- Puedes agregar cualquier métrica que consideres útil

## 🔒 Cybersecurity

### Major: WAF/ModSecurity + HashiCorp Vault
**Tecnologías**: ModSecurity, HashiCorp Vault

**Descripción**: Mejorar la infraestructura de seguridad del proyecto

**Características**:
- Configurar y desplegar un Web Application Firewall (WAF) y ModSecurity con configuración estricta y segura
- Proteger contra ataques basados en web
- Integrar HashiCorp Vault para gestionar y almacenar de forma segura información sensible
- Almacenar API keys, credenciales y variables de entorno de forma encriptada y aislada

### Minor: Cumplimiento GDPR
**Descripción**: Introducir opciones de cumplimiento GDPR que permitan a usuarios ejercer sus derechos de privacidad de datos

**Características**:
- Implementar características compatibles con GDPR que permitan a usuarios solicitar anonimización de sus datos personales
- Proporcionar herramientas para que usuarios gestionen sus datos locales (ver, editar o eliminar información personal)
- Ofrecer un proceso simplificado para que usuarios soliciten la eliminación permanente de sus cuentas, incluyendo todos los datos asociados
- Mantener comunicación clara y transparente con usuarios sobre sus derechos de privacidad de datos

**Nota**: Si no estás familiarizado con GDPR, se recomienda visitar el sitio web oficial de la Comisión Europea sobre protección de datos.

### Major: 2FA y JWT
**Tecnologías**: Two-Factor Authentication, JSON Web Tokens

**Descripción**: Mejorar la seguridad y autenticación de usuarios

**Características**:
- Implementar Two-Factor Authentication (2FA) como capa adicional de seguridad
- Requerir a usuarios proporcionar un método de verificación secundario (código de un solo uso) además de su contraseña
- Utilizar JSON Web Tokens (JWT) como método seguro para autenticación y autorización
- Asegurar que sesiones de usuario y acceso a recursos se gestionen de forma segura
- Proporcionar un proceso de configuración fácil de usar para habilitar 2FA
- Opciones para códigos SMS, aplicaciones autenticadoras o verificación basada en email
- Asegurar que los tokens JWT se emitan y validen de forma segura

## 🚀 Devops

### Major: Infraestructura ELK para Gestión de Logs
**Tecnologías**: Elasticsearch, Logstash, Kibana

**Descripción**: Establecer una infraestructura robusta para gestión y análisis de logs usando el stack ELK

**Características**:
- Desplegar Elasticsearch para almacenar e indexar datos de logs de forma eficiente
- Configurar Logstash para recolectar, procesar y transformar datos de logs de varias fuentes
- Enviar datos procesados a Elasticsearch
- Configurar Kibana para visualizar datos de logs, crear dashboards y generar información
- Definir políticas de retención y archivado de datos
- Implementar medidas de seguridad para proteger datos de logs y acceso a componentes ELK

### Minor: Sistema de Monitoreo
**Tecnologías**: Prometheus, Grafana

**Descripción**: Configurar un sistema de monitoreo completo usando Prometheus y Grafana

**Características**:
- Desplegar Prometheus como toolkit de monitoreo y alertas
- Recolectar métricas y monitorear la salud y rendimiento de varios componentes del sistema
- Configurar exportadores de datos e integraciones para capturar métricas de diferentes servicios, bases de datos y componentes de infraestructura
- Crear dashboards y visualizaciones personalizadas usando Grafana
- Proporcionar información en tiempo real sobre métricas y rendimiento del sistema
- Configurar reglas de alerta en Prometheus para detectar y responder proactivamente a problemas críticos y anomalías
- Asegurar estrategias adecuadas de retención y almacenamiento para datos de métricas históricas
- Implementar mecanismos de autenticación y control de acceso seguros para Grafana

### Major: Backend como Microservicios
**Descripción**: Arquitecturar el backend del sistema usando un enfoque de microservicios

**Características**:
- Dividir el backend en microservicios más pequeños y débilmente acoplados
- Cada microservicio responsable de funciones o características específicas
- Definir límites e interfaces claros entre microservicios
- Permitir desarrollo, despliegue y escalado independientes
- Implementar mecanismos de comunicación entre microservicios
- Comunicación mediante RESTful APIs o message queues
- Facilitar intercambio de datos y coordinación
- Asegurar que cada microservicio sea responsable de una única tarea o capacidad de negocio bien definida

## 🎨 Graphics

### Major: Técnicas Avanzadas de 3D
**Tecnología**: Babylon.js

**Descripción**: Mejorar los aspectos visuales del juego Pong usando técnicas avanzadas de 3D

**Características**:
- Implementar técnicas avanzadas de gráficos 3D para elevar la calidad visual del juego Pong
- Utilizar Babylon.js para crear efectos visuales impresionantes
- Sumergir a jugadores en el entorno de juego
- Incorporar técnicas avanzadas de 3D para mejorar la experiencia general de juego
- Proporcionar a usuarios un juego Pong visualmente atractivo y cautivador

## ♿ Accessibility

### Minor: Soporte en Todos los Dispositivos
**Descripción**: Asegurar que el sitio web funcione perfectamente en todos los tipos de dispositivos

**Características**:
- Asegurar que el sitio web sea responsive
- Adaptarse a diferentes tamaños de pantalla y orientaciones
- Proporcionar una experiencia de usuario consistente en desktop, laptop, tablet y smartphone
- Asegurar que usuarios puedan navegar e interactuar fácilmente usando diferentes métodos de entrada (pantallas táctiles, teclados, ratones)

### Minor: Expandir Compatibilidad de Navegadores
**Descripción**: Mejorar la compatibilidad de la aplicación web agregando soporte para un navegador web adicional

**Características**:
- Extender soporte de navegador para incluir un navegador web adicional
- Asegurar que usuarios puedan acceder y usar la aplicación sin problemas
- Realizar pruebas y optimización exhaustivas
- Asegurar que la aplicación web funcione correctamente y se muestre correctamente en el navegador recién soportado
- Abordar cualquier problema de compatibilidad o discrepancia de renderizado
- Asegurar una experiencia de usuario consistente en todos los navegadores soportados

### Minor: Soporte para Múltiples Idiomas
**Descripción**: Asegurar que el sitio web soporte múltiples idiomas para atender a una base de usuarios diversa

**Características**:
- Implementar soporte para un mínimo de 3 idiomas en el sitio web
- Proporcionar un selector o cambiador de idioma que permita a usuarios cambiar fácilmente el idioma del sitio web
- Traducir contenido esencial del sitio web (menús de navegación, encabezados, información clave)
- Asegurar que usuarios puedan navegar e interactuar sin problemas, independientemente del idioma seleccionado
- Considerar usar paquetes de idioma o librerías de localización
- Permitir a usuarios establecer su idioma preferido como predeterminado para visitas posteriores

### Minor: Accesibilidad para Usuarios con Discapacidad Visual
**Descripción**: Hacer el sitio web más accesible para usuarios con discapacidad visual

**Características**:
- Soporte para lectores de pantalla y tecnologías de asistencia
- Texto alternativo claro y descriptivo para imágenes
- Esquema de colores de alto contraste para legibilidad
- Navegación por teclado y gestión de foco
- Opciones para ajustar el tamaño del texto
- Actualizaciones regulares para cumplir con estándares de accesibilidad

### Minor: Integración de Server-Side Rendering (SSR)
**Descripción**: Integrar Server-Side Rendering para mejorar el rendimiento y la experiencia de usuario

**Características**:
- Implementar SSR para mejorar la velocidad de carga y el rendimiento general del sitio web
- Asegurar que el contenido se pre-renderice en el servidor y se entregue a los navegadores de usuarios
- Cargas iniciales de página más rápidas
- Optimizar SEO proporcionando contenido HTML pre-renderizado a motores de búsqueda
- Mantener una experiencia de usuario consistente mientras se beneficia de las ventajas de SSR

## 🎯 Server-Side Pong

### Major: Reemplazar Pong Básico con Server-Side Pong e Implementar API
**Descripción**: Reemplazar el juego Pong básico con un juego Pong del lado del servidor, acompañado de la implementación de una API

**Características**:
- Desarrollar lógica del lado del servidor para el juego Pong
- Manejar gameplay, movimiento de la pelota, puntuación e interacciones de jugadores
- Crear una API que exponga los recursos y endpoints necesarios para interactuar con el juego Pong
- Permitir uso parcial del juego vía Command-Line Interface (CLI) e interfaz web
- Diseñar e implementar endpoints de API para soportar inicialización del juego, controles del jugador y actualizaciones del estado del juego
- Asegurar que el juego Pong del lado del servidor sea responsivo
- Proporcionar una experiencia de juego atractiva y agradable
- Integrar el juego Pong del lado del servidor con la aplicación web

### Major: Habilitar Gameplay de Pong vía CLI contra Usuarios Web
**Descripción**: Desarrollar una Command-Line Interface (CLI) que permita a usuarios jugar Pong contra jugadores usando la versión web del juego

**Características**:
- Crear una aplicación CLI robusta que replique la experiencia de gameplay de Pong disponible en el sitio web
- Proporcionar a usuarios CLI la capacidad de iniciar y participar en partidos de Pong
- Utilizar la API para establecer comunicación entre el CLI y la aplicación web
- Permitir a usuarios CLI conectarse al sitio e interactuar con jugadores web
- Desarrollar un mecanismo de autenticación de usuario dentro del CLI
- Permitir a usuarios CLI iniciar sesión en la aplicación web de forma segura
- Implementar sincronización en tiempo real entre el CLI y usuarios web
- Asegurar que las interacciones de gameplay sean fluidas y consistentes
- Habilitar a usuarios CLI unirse y crear partidos de Pong con jugadores web
- Facilitar gameplay multiplataforma
- Proporcionar documentación y guía comprensiva sobre cómo usar el CLI efectivamente

**Dependencia**: Se recomienda fuertemente hacer el módulo anterior primero (Replace Basic Pong with Server-Side Pong)

## 📝 Notas Importantes

### Elección de Módulos
- **Leer todo el subject antes de elegir módulos**
- Algunos módulos pueden depender de otros
- Algunos módulos pueden entrar en conflicto con otros
- Considerar estrategias y diseño antes de comenzar a codificar

### Uso de Librerías
- Ver `rules-constraints.md` para reglas detalladas sobre uso de librerías
- No usar librerías que resuelvan un módulo completo
- Justificar cualquier uso de librería durante la evaluación

### Bonus
- Solo se evalúa si la parte obligatoria es PERFECTA
- 5 puntos por módulo menor
- 10 puntos por módulo mayor


