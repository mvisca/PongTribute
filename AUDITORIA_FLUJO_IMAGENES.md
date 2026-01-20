# 🔍 AUDITORÍA COMPLETA DEL FLUJO DE IMÁGENES Y ANÁLISIS DEL PROYECTO

**Fecha:** 19 de Enero 2026  
**Alcance:** Flujo de imágenes (auth/register, user/update), validaciones, repositories

---

## 📋 RESUMEN EJECUTIVO

### ✅ HALLAZGOS POSITIVOS
1. **Validación base64 implementada** en auth.service y user.service
2. **Manejo de errores consistente** con SharedErrors
3. **Context agregado a errors** para debugging
4. **Fallback a avatar default** en ambos servicios

### ⚠️ PROBLEMAS DETECTADOS
1. **BUG CRÍTICO:** Duplicación de payload en auth.service (línea 457-465)
2. **Inconsistencia:** Fallback diferente entre auth y user (default vs mantener anterior)
3. **Validación insuficiente:** No se valida mime-type de verdad, solo regex
4. **Error handling incompleto:** No se captura cuando response.json() falla
5. **Repository no valida avatar URL** antes de guardar
6. **No hay validación de imagen retornada** por Image Service

---

## 🔄 FLUJO COMPLETO DE IMÁGENES

### 1️⃣ FLUJO: AUTH/REGISTER CON AVATAR

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Frontend envía: POST /auth/register                      │
│    { username, email, password, avatar?: "data:image/..."}  │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. AuthController.register()                                │
│    (sin validación del avatar aquí)                         │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. AuthService.register()                                   │
│    - validateAvatar(avatar) → regex check + size check ✓   │
│    - uploadAvatarToCloudinary(avatar)                       │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. AuthService.uploadAvatarToCloudinary()                   │
│    POST /internal/upload                                    │
│    ⚠️ BUG: Crea payload pero no lo usa (línea 457)          │
│    ⚠️ Envía {base64, old_avatar} correctamente (línea 459)  │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. ImageService responde                                    │
│    { url: "https://res.cloudinary.com/..." }               │
│    ⚠️ No hay validación de que URL es válida               │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│ 6. AuthService.register() → User Service                    │
│    POST /internal/users                                     │
│    { username, email, password, avatar: URL }              │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│ 7. UserService.createUser() → Repository                    │
│    ⚠️ NO valida avatar URL en UserNormalizer                │
│    - Guarda avatar URL directamente en DB ✓                │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│ 8. SQLiteUserRepository.create()                            │
│    INSERT INTO users (avatar) VALUES (URL)                 │
└────────────────────────────────────────────────────────────┘
```

### 2️⃣ FLUJO: USER/UPDATE CON AVATAR

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Frontend envía: PATCH /users/{id}                        │
│    { avatar?: "data:image/...", email?, username? }         │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. UserController.updateUser()                              │
│    - Requiere JWT + ownership ✓                             │
│    (sin validación adicional)                               │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. UserService.updateUser()                                 │
│    - Obtiene user actual del repo                           │
│    - Si avatar && starsWith('data:image/')                  │
│      - validateAvatar(avatar) → regex + size ✓             │
│      - uploadAvatarToCloudinary(avatar, user.avatar)        │
│        (pasa URL actual para posible eliminación)           │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. ImageService.upload() responde { url: "..." }           │
│    ⚠️ Diferencia con Auth: mantiene old URL si falla       │
│       (fallback a oldAvatarUrl || DEFAULT)                 │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. UserService.updateUser() → Repository                    │
│    data.avatar = <nueva URL>                                │
│    ⚠️ NO valida URL antes de guardar                        │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│ 6. SQLiteUserRepository.update()                            │
│    UPDATE users SET avatar = ? WHERE id = ?                │
└────────────────────────────────────────────────────────────┘
```

---

## 🐛 BUGS Y VULNERABILIDADES DETECTADOS

### 🔴 CRÍTICO: Duplicación de payload en auth.service.ts línea 457

**Ubicación:** `/packages/auth/src/services/auth.service.ts:457-465`

```typescript
// ❌ LÍNEA 457-458: Se crea payload pero NO se usa
const payload = { base64: base64Image, ...(oldAvatarUrl && { old_avatar: oldAvatarUrl }) };

// ✓ LÍNEA 459-465: Se crea otro payload que se envía
const response = await fetch(
    `${AuthEnv.IMAGE_SERVICE_URL()}/internal/upload`,
    {
        body: JSON.stringify({
            base64: base64Image,
            ...( oldAvatarUrl && { old_avatar: oldAvatarUrl })
        })
    }
);
```

**Impacto:** Código muerto, potencial confusión  
**Severidad:** Bajo (funciona correctamente, pero código innecesario)

**Solución:**
```typescript
private async uploadAvatarToCloudinary(
    base64Image: string,
    oldAvatarUrl?: string
): Promise<string> {
    try {
        const payload = { 
            base64: base64Image, 
            ...(oldAvatarUrl && { old_avatar: oldAvatarUrl }) 
        };

        const response = await fetch(
            `${AuthEnv.IMAGE_SERVICE_URL()}/internal/upload`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Service-Secret': AuthEnv.SERVICE_SECRET()
                },
                body: JSON.stringify(payload)  // ← USAR payload
            }
        );
        // ... resto del código
    } catch (err) {
        // ...
    }
}
```

---

### 🟠 IMPORTANTE: Inconsistencia en fallback de avatar

**Ubicación:** 
- auth.service.ts:487 → fallback a **DEFAULT**
- user.service.ts:64 → fallback a **oldAvatarUrl || DEFAULT**

**Problema:** Comportamiento inconsistente entre servicios

```typescript
// ❌ AUTH SERVICE (línea 487)
catch (err) {
    console.error('Fallo subiendo avatar: ', err);
    return AuthEnv.CLOUDINARY_DEFAULT_AVATAR();  // Pierde avatar anterior
}

// ✓ USER SERVICE (línea 64)
catch (err) {
    console.error('Fallo subiendo avatar: ', err);
    return oldAvatarUrl || UserEnv.CLOUDINARY_DEFAULT_AVATAR();  // Mantiene anterior
}
```

**Impacto:** En auth/register si Image Service falla, se asigna default  
**Severidad:** Media (UX problem, pero no es un bug técnico)

**Recomendación:** Mantener comportamiento de USER SERVICE en ambos (más seguro)

---

### 🟠 IMPORTANTE: Validación de regex insuficiente

**Ubicación:** auth.service.ts:436, user.service.ts:18

```typescript
private validateAvatar(avatar?: string): boolean {
    if (!avatar || avatar.trim() === "") return false;
    
    // ⚠️ Solo valida formato, NO el contenido real
    const base64Regex = /^data:image\/(png|jpg|jpeg|webp);base64,[A-Za-z0-9+/=]+$/;
    if (!base64Regex.test(avatar)) return false;
    
    // ⚠️ Tamaño aproximado, no exacto
    const base64Data = avatar.split(',')[1];
    if (!base64Data) return false;
    
    const sizeInBytes = (base64Data.length * 3) / 4; // Aproximación
    const maxSizeBytes = 10 * 1024 * 1024; // 10MB
    
    return sizeInBytes <= maxSizeBytes;
}
```

**Problemas:**
1. No valida que el base64 sea válido (puede ser base64 inválido que pase regex)
2. No valida MIME type real (solo toma lo que dice `data:image/png` sin verificar)
3. Tamaño es aproximado, puede permitir >10MB

**Severidad:** Media (Image Service lo validará, pero es defensa en profundidad)

**Mejora recomendada:**
```typescript
private validateAvatar(avatar?: string): boolean {
    if (!avatar || avatar.trim() === "") return false;
    
    const base64Regex = /^data:image\/(png|jpg|jpeg|webp);base64,([A-Za-z0-9+/=]+)$/;
    const match = avatar.match(base64Regex);
    if (!match) return false;
    
    const [, mimeType, base64Data] = match;
    
    // Validar base64 es válido
    try {
        Buffer.from(base64Data, 'base64');
    } catch {
        return false;  // Base64 inválido
    }
    
    // Tamaño exacto
    const sizeInBytes = Buffer.from(base64Data, 'base64').length;
    const maxSizeBytes = 10 * 1024 * 1024;
    
    return sizeInBytes <= maxSizeBytes;
}
```

---

### 🟠 IMPORTANTE: Error handling incompleto en ImageService call

**Ubicación:** auth.service.ts:475-477, user.service.ts:48-50

```typescript
if (!response.ok) {
    const error = await response.json();  // ⚠️ Puede fallar si response no es JSON
    const errorMessage = error ? error : "No hay mensaje de error";
    throw new SharedErrors.ServiceError(...);
}
```

**Problema:** Si `response.json()` lanza excepción (response no es JSON válido), se propaga sin manejo

**Severidad:** Media

**Solución implementada en user.service:**
```typescript
if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Unknown error' }));
    throw new SharedErrors.ServiceError('image', ...);
}
```

**Acción requerida:** Aplicar esta solución también a auth.service.ts

---

### 🟡 IMPORTANTE: No se valida URL retornada por Image Service

**Ubicación:** auth.service.ts:481, user.service.ts:61

```typescript
const data = await response.json() as { url: string };
return data.url;  // ⚠️ Confía que es una URL válida
```

**Problema:** No se valida que `data.url` sea una URL válida (Cloudinary o válida en general)

**Severidad:** Media (potencial inyección de URLs maliciosas)

**Solución:**
```typescript
const data = await response.json() as { url: string };

// Validar URL
if (!data.url || typeof data.url !== 'string') {
    throw new SharedErrors.ValidationError(
        'Image Service retornó URL inválida',
        'url',
        { receivedUrl: data.url, operation: 'uploadAvatarToCloudinary' }
    );
}

// Validar que sea una URL válida
try {
    new URL(data.url);  // Lanza si no es URL válida
} catch (e) {
    throw new SharedErrors.ValidationError(
        'Image Service retornó URL no válida',
        'url',
        { receivedUrl: data.url, operation: 'uploadAvatarToCloudinary' }
    );
}

return data.url;
```

---

### 🟡 IMPORTANTE: Repository no valida avatar URL

**Ubicación:** /packages/user/src/repositories/SQLiteUserRepository.ts línea 48

```typescript
async create(data: UserTypes.CreateUserBody): Promise<UserTypes.UserPublic> {
    const newUser: UserTypes.UserInternal = {
        // ...
        avatar: data.avatar || UserEnv.CLOUDINARY_DEFAULT_AVATAR(),  // ⚠️ No valida
        // ...
    };
    
    this.db.prepare(`
        INSERT INTO users (..., avatar, ...)
        VALUES (..., @avatar, ...)
    `).run(row);
}
```

**Problema:** No hay normalización ni validación del avatar URL

**Severidad:** Baja (confía en la capa anterior)

**Recomendación:** Usar `UserNormalizer.avatar()` también en repository

```typescript
async create(data: UserTypes.CreateUserBody): Promise<UserTypes.UserPublic> {
    const newUser: UserTypes.UserInternal = {
        // ...
        avatar: Utils.UserNormalizer.avatar(data.avatar) || UserEnv.CLOUDINARY_DEFAULT_AVATAR(),
        // ...
    };
}
```

---

### 🟡 IMPORTANTE: UserNormalizer.avatar() probablemente insuficiente

**Ubicación:** Necesita verificación en `@transcendence/shared/src/utils`

**Recomendación:** Revisar que UserNormalizer.avatar valide URLs Cloudinary

```typescript
// Debería validar algo como:
avatar(value?: string): string | undefined {
    if (!value) return undefined;
    
    // Validar que sea URL válida y de Cloudinary
    if (!value.startsWith('https://res.cloudinary.com/')) {
        return undefined;
    }
    
    try {
        new URL(value);
        return value;
    } catch {
        return undefined;
    }
}
```

---

## 📊 MATRIZ DE VALIDACIONES

### En Auth.register

| Punto | Qué | Dónde | ¿Validado? | Severidad |
|-------|-----|-------|-----------|-----------|
| 1 | Base64 formato | auth.service.validateAvatar | ✓ Regex | Suficiente |
| 2 | Base64 válido | auth.service.validateAvatar | ❌ No | Media |
| 3 | Tamaño máximo | auth.service.validateAvatar | ✓ Aprox | Suficiente |
| 4 | MIME type | auth.service.validateAvatar | ❌ Solo regex | Baja |
| 5 | Upload a Image Service | auth.service.uploadAvatar | ✓ ServiceError | ✓ |
| 6 | URL retornada válida | auth.service.uploadAvatar | ❌ No | Media |
| 7 | Avatar URL en DB | SQLiteUserRepository | ❌ No | Baja |

### En User.update

| Punto | Qué | Dónde | ¿Validado? | Severidad |
|-------|-----|-------|-----------|-----------|
| 1 | Base64 formato | user.service.validateAvatar | ✓ Regex | Suficiente |
| 2 | Base64 válido | user.service.validateAvatar | ❌ No | Media |
| 3 | Tamaño máximo | user.service.validateAvatar | ✓ Aprox | Suficiente |
| 4 | MIME type | user.service.validateAvatar | ❌ Solo regex | Baja |
| 5 | Upload a Image Service | user.service.uploadAvatar | ✓ ServiceError | ✓ |
| 6 | URL retornada válida | user.service.uploadAvatar | ❌ No | Media |
| 7 | Avatar URL en DB | SQLiteUserRepository | ❌ No | Baja |

---

## 🛡️ RECOMENDACIONES DE SEGURIDAD

### Prioridad 1 (CRÍTICO)
1. ✅ Eliminar código duplicado de payload en auth.service.ts
2. ✅ Validar URLs retornadas por Image Service (ambos servicios)
3. ✅ Mejorar validación de base64 (verifica que sea base64 válido)

### Prioridad 2 (IMPORTANTE)
1. ✅ Estandarizar fallback de avatar (usar patrón de user.service)
2. ✅ Aplicar UserNormalizer.avatar() en repository
3. ✅ Mejorar error handling en response.json() en auth.service

### Prioridad 3 (RECOMENDADO)
1. ✅ Agregar validación real de MIME type (server-side en Image Service)
2. ✅ Agregar logging de intentos de avatar inválidos
3. ✅ Considerar antivirus scanning en Image Service

---

## ✅ RESUMEN DE ACCIONES REQUERIDAS

```
[ ] 1. Remover payload duplicado en auth.service.ts (línea 457)
[ ] 2. Validar URL de Image Service en ambos servicios
[ ] 3. Mejorar validación de base64 (no solo regex)
[ ] 4. Aplicar catch en response.json() en auth.service
[ ] 5. Estandarizar fallback de avatar en auth.service
[ ] 6. Validar UserNormalizer.avatar() y aplicar en repository
[ ] 7. Agregar tests de seguridad para avatar upload
[ ] 8. Documentar límites y formatos de avatar en OpenAPI/Swagger
```

---

## 📝 NOTAS ADICIONALES

### Flujos adicionales NO revisados (fuera de alcance)
- ❓ Eliminación de avatar anterior en Cloudinary (¿implementado?)
- ❓ Validación en Image Service (¿es service externo?)
- ❓ Rate limiting en upload de avatares
- ❓ Detección de malware/scripts en base64

### Observaciones generales positivas
- ✅ Estructura de errores bien implementada con context
- ✅ Middleware de autenticación protege endpoints
- ✅ Separación de concerns clara (service/repository/controller)
- ✅ Manejo consistente de fallbacks

