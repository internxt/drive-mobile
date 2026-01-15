# 📋 Reporte: Flujos de Validación y Refresh de Tokens

**Fecha**: 22 de Diciembre de 2024
**Aplicación**: Internxt Drive Mobile
**Versión analizada**: 1.8.3

---

## 🎯 Resumen Ejecutivo

Este documento detalla **todos los puntos** donde la aplicación móvil verifica la validez de los tokens de autenticación y ejecuta procesos de refresh o logout. Este análisis es crítico para entender **por qué un usuario puede ser deslogueado inesperadamente**.

### Conclusión Principal:
**No existe "grace period" en el servidor.** Los tokens expirados son rechazados inmediatamente. La app tiene 4 puntos principales de validación donde puede ocurrir un logout automático.

---

## 📊 Flujos de Validación y Refresh

### 1️⃣ **Al Iniciar la App** (Cold Start)

**Ubicación**: `App.tsx:64-68` → `auth/index.ts:64-95`

**Flujo**:
```typescript
initializeApp()
  └─> silentSignIn()
      ├─> silentSignInThunk()  // ⚠️ VALIDA EXPIRACIÓN
      └─> refreshTokensThunk() // 🔄 REFRESCA TOKENS
```

**Detalles**:

**a) `silentSignInThunk()` - Validación de Expiración**
- **Archivo**: `src/store/slices/auth/index.ts:64-95`
- **Qué hace**:
  1. Lee tokens del almacenamiento seguro (SecureStore)
  2. Verifica si `photosToken` está expirado mediante `authTokenHasExpired()`
  3. Verifica si `accessToken` está expirado mediante `authTokenHasExpired()`
  4. **Si cualquiera está expirado** → Lanza error → **LOGOUT INMEDIATO**

**Código crítico**:
```typescript
const newTokenIsExpired = authService.authTokenHasExpired(credentials.photosToken);
if (newTokenIsExpired) throw new Error('New token is expired');  // ❌ LOGOUT

const tokenIsExpired = authService.authTokenHasExpired(credentials.accessToken);
if (tokenIsExpired) throw new Error('Token is expired');  // ❌ LOGOUT
```

**b) `refreshTokensThunk()` - Refresh Proactivo**
- **Archivo**: `src/store/slices/auth/index.ts:135-179`
- **Qué hace**:
  1. Intenta refrescar los tokens llamando al endpoint `/users/refresh`
  2. **Si el servidor rechaza el refresh** → Limpia storage → **LOGOUT**

**⚠️ PROBLEMA CRÍTICO**:
- `silentSignInThunk()` hace logout **ANTES** de que `refreshTokensThunk()` tenga oportunidad de intentar el refresh
- Si los tokens están expirados al abrir la app, el usuario es deslogueado sin intentar recuperación

**Posibles causas de logout**:
- ✅ Usuario no abrió la app en más de 30 días (expiración típica de JWT)
- ✅ Tokens locales fueron corrompidos o eliminados
- ✅ Reloj del dispositivo adelantado (hace que los tokens parezcan expirados)

---

### 2️⃣ **Al Reactivar la App** (Background → Foreground)

**Ubicación**: `App.tsx:76-90`

**Flujo**:
```typescript
handleAppStateChange(state: 'active')
  └─> checkAndRefreshTokenThunk()  // 🔍 VERIFICA Y REFRESCA
```

**Detalles**:

**`checkAndRefreshTokenThunk()` - Verificación Inteligente**
- **Archivo**: `src/store/slices/auth/index.ts:181-198`
- **Qué hace**:
  1. Lee `photosToken` del storage
  2. Verifica si el token **necesita refresh** mediante `tokenNeedsRefresh()`
     - Devuelve `true` si el token expira en menos de **3 días** (72 horas)
  3. **Si necesita refresh** → Ejecuta `refreshTokensThunk()`
  4. **Si el refresh falla** → **LOGOUT**

**Código crítico**:
```typescript
const tokenNeedsRefresh = token && authService.tokenNeedsRefresh(token);

if (tokenNeedsRefresh) {
  logger.info('Token expires soon, refreshing...');
  await dispatch(refreshTokensThunk());  // 🔄 Puede causar LOGOUT si falla
}
```

**Posibles causas de logout**:
- ✅ Token expira en menos de 3 días y el servidor rechaza el refresh
- ✅ Red no disponible durante el intento de refresh (causa error HTTP)
- ✅ Servidor devuelve 401/403 por token inválido

---

### 3️⃣ **Verificación Periódica en Background** (Drive Context)

**Ubicación**: `src/contexts/Drive/Drive.context.tsx:82-98`

**Flujo**:
```typescript
handleAppStateChange(state: 'active')
  └─> Registrado en onAppStateChange listener
```

**Detalles**:
- El contexto de Drive también escucha cambios de estado de la app
- **NO ejecuta validación de tokens directamente**
- Puede interactuar con APIs que requieren tokens válidos
- **Si una API devuelve 401** → Puede desencadenar logout indirecto

---

### 4️⃣ **Refresh Proactivo al Inicializar Usuario**

**Ubicación**: `App.tsx:98-102` → `auth/index.ts:36-56`

**Flujo**:
```typescript
onUserLoggedIn()
  └─> initializeThunk()
      └─> Lee credentials y verifica validez
```

**Detalles**:

**`initializeThunk()`**
- **Archivo**: `src/store/slices/auth/index.ts:36-56`
- **Qué hace**:
  1. Lee credenciales del storage
  2. **Si NO hay credenciales** → **LOGOUT**
  3. Inicializa SDK con tokens
  4. Refresca información del usuario

**Código crítico**:
```typescript
const { credentials } = await authService.getAuthCredentials();

if (credentials) {
  // OK, continuar
} else {
  dispatch(authActions.setLoggedIn(false));  // ❌ LOGOUT
}
```

**Posibles causas de logout**:
- ✅ SecureStore no devuelve credenciales (corrupción de datos)
- ✅ Storage fue limpiado por el sistema operativo
- ✅ Reinstalación de la app sin backup

---

## 🔍 Métodos de Validación de Tokens

### `authTokenHasExpired(token: string): boolean`

**Archivo**: `src/services/AuthService.ts:362-390`

**Qué hace**:
1. Decodifica el JWT usando `jwtDecode<JWTPayload>(token)`
2. Lee el campo `exp` (timestamp de expiración en segundos)
3. Compara con el tiempo actual
4. Devuelve `true` si `Date.now() / 1000 > exp`

**Código**:
```typescript
public authTokenHasExpired(authToken: string): boolean {
  try {
    const decodedToken = jwtDecode<JWTPayload>(authToken);
    const nowInSecs = Date.now() / 1000;
    const expiresInDays = ((decodedToken.exp - nowInSecs) / 86400).toFixed(2);
    const hasExpired = nowInSecs > decodedToken.exp;

    if (__DEV__) {
      logger.info(`🧪 [DEBUG] authTokenHasExpired: ${hasExpired} (expires in ${expiresInDays} days)`);
    }

    return hasExpired;
  } catch {
    return true;  // ⚠️ Si no se puede decodificar, se considera expirado
  }
}
```

**⚠️ Caso especial**: Si el token está malformado o no se puede decodificar, **se considera expirado** (return `true`)

---

### `tokenNeedsRefresh(token: string): boolean`

**Archivo**: `src/services/AuthService.ts:397-432`

**Qué hace**:
1. Decodifica el JWT
2. Calcula cuánto tiempo falta para que expire
3. Compara con el umbral de refresh (**72 horas / 3 días** por defecto)
4. Devuelve `true` si expira en menos del umbral

**Código**:
```typescript
public tokenNeedsRefresh(authToken: string): boolean {
  try {
    const decodedToken = jwtDecode<JWTPayload>(authToken);
    const nowInSecs = Date.now() / 1000;
    const THRESHOLD_MS = this.debugFlags.customRefreshThresholdMs || (3 * 24 * 60 * 60 * 1000);
    const THRESHOLD_SECS = THRESHOLD_MS / 1000;

    const timeUntilExpiration = decodedToken.exp - nowInSecs;
    const needsRefresh = timeUntilExpiration < THRESHOLD_SECS;

    if (__DEV__) {
      const hoursUntilExp = (timeUntilExpiration / 3600).toFixed(2);
      const thresholdHours = (THRESHOLD_SECS / 3600).toFixed(2);
      logger.info(`🧪 [DEBUG] tokenNeedsRefresh: ${needsRefresh} (expires in ${hoursUntilExp}h, threshold: ${thresholdHours}h)`);
    }

    return needsRefresh;
  } catch {
    return true;  // ⚠️ Si no se puede decodificar, se fuerza refresh
  }
}
```

**Umbral por defecto**: 3 días (259,200 segundos)

---

### `refreshAuthToken(token: string): Promise<NewTokens>`

**Archivo**: `src/services/AuthService.ts:457-495`

**Qué hace**:
1. Llama al endpoint `GET /users/refresh` con el token actual
2. **Si el servidor responde 200** → Devuelve nuevos tokens
3. **Si el servidor responde 401/403** → Lanza error → **Desencadena LOGOUT**

**Código**:
```typescript
public async refreshAuthToken(currentAuthToken: string) {
  const result = await fetch(`${DRIVE_NEW_API_URL}/users/refresh`, {
    method: 'GET',
    headers: await getHeaders(currentAuthToken),
  });

  if (!result.ok) {
    throw new Error('Tokens no longer valid, should sign out');  // ❌ Causa LOGOUT
  }

  const { newToken, token, user } = await result.json();
  return { newToken, token, user };
}
```

**⚠️ NO HAY GRACE PERIOD**: Si el token está expirado según el JWT, el servidor lo rechaza inmediatamente.

---

## 🚨 Escenarios de Logout Automático

### Escenario 1: Token Expirado al Abrir la App

**Flujo**:
1. Usuario no abrió la app en 30+ días
2. Al abrir: `silentSignInThunk()` → `authTokenHasExpired()` → `true`
3. **LOGOUT INMEDIATO** sin intentar refresh

**Resultado**: ✅ **Comportamiento esperado** (tokens realmente expirados)

---

### Escenario 2: Error de Red Durante Refresh

**Flujo**:
1. App pasa a foreground
2. `checkAndRefreshTokenThunk()` detecta que token expira en < 3 días
3. Intenta refresh → Red no disponible → Error HTTP
4. `refreshTokensThunk()` falla → **LOGOUT**

**Resultado**: ⚠️ **POSIBLE FALSO POSITIVO** - El token podría ser válido pero la red falló

**Solución propuesta**: Implementar retry con backoff exponencial antes de logout

---

### Escenario 3: Reloj del Dispositivo Adelantado

**Flujo**:
1. Usuario cambia manualmente el reloj del dispositivo (ej: adelanta 1 mes)
2. `authTokenHasExpired()` compara `Date.now()` con `token.exp`
3. El token parece expirado → **LOGOUT**

**Resultado**: ⚠️ **FALSO POSITIVO** - El token es válido pero el reloj local está mal

**Solución propuesta**:
- Usar tiempo del servidor en lugar de `Date.now()`
- Validar coherencia del reloj del sistema

---

### Escenario 4: Storage Corrupto o Limpiado

**Flujo**:
1. Sistema operativo limpia SecureStore (memoria baja, reinstalación, etc.)
2. `getAuthCredentials()` no encuentra credenciales
3. `initializeThunk()` → **LOGOUT**

**Resultado**: ✅ **Comportamiento esperado** (no hay forma de recuperar sesión)

---

### Escenario 5: Servidor Revoca Token

**Flujo**:
1. Servidor revoca el refresh token (ej: cambio de contraseña, sesión revocada)
2. App intenta refresh → Servidor devuelve 401
3. `refreshAuthToken()` lanza error → **LOGOUT**

**Resultado**: ✅ **Comportamiento esperado** (decisión del servidor)

---

## 📈 Estadísticas de Expiración

### Duración Típica de Tokens

Según el código y logs observados:

- **Access Token (`token`)**: ~30 días
- **Photos Token (`newToken`)**: ~30 días
- **Umbral de refresh proactivo**: 3 días antes de expiración

### Ventanas de Refresh

```
Día 0                     Día 27                   Día 30
├─────────────────────────┼────────────────────────┤
Token creado              Inicio de refresh         Token expira
                          (checkAndRefreshToken)    (silentSignIn → logout)
```

**Ventana de seguridad**: 3 días (72 horas) antes de la expiración

---

## 🔧 Problemas Identificados

### 1. Logout Prematuro en `silentSignInThunk()`

**Problema**:
```typescript
// App.tsx:64-68
const silentSignIn = async () => {
  await dispatch(authThunks.silentSignInThunk());  // ❌ Logout si tokens expirados
  await dispatch(authThunks.refreshTokensThunk()); // ⚠️ Nunca se ejecuta si hay logout
};
```

**Impacto**: Si el usuario abre la app con tokens expirados, no se intenta refresh primero.

**Solución propuesta**:
```typescript
const silentSignIn = async () => {
  const { credentials } = await authService.getAuthCredentials();

  const tokensExpired =
    authService.authTokenHasExpired(credentials.accessToken) ||
    authService.authTokenHasExpired(credentials.photosToken);

  if (tokensExpired) {
    // Intentar refresh PRIMERO antes de logout
    try {
      await dispatch(authThunks.refreshTokensThunk());
      // ✅ Refresh exitoso, continuar
      dispatch(authActions.setSignInData({ ... }));
    } catch {
      // ❌ Refresh falló, ahora sí hacer logout
      dispatch(authActions.setLoggedIn(false));
    }
  } else {
    // Tokens válidos, continuar normalmente
    await dispatch(authThunks.silentSignInThunk());
  }
};
```

---

### 2. Sin Reintentos en Errores de Red

**Problema**: `refreshAuthToken()` no distingue entre:
- Error de red (timeout, no internet)
- Token inválido (401 del servidor)

**Impacto**: Un error temporal de red puede causar logout permanente.

**Solución propuesta**:
```typescript
public async refreshAuthToken(currentAuthToken: string, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const result = await fetch(`${DRIVE_NEW_API_URL}/users/refresh`, {
        method: 'GET',
        headers: await getHeaders(currentAuthToken),
        timeout: 10000,
      });

      if (result.status === 401 || result.status === 403) {
        // Token definitivamente inválido, no reintentar
        throw new Error('Token revoked by server');
      }

      if (!result.ok) {
        // Error de servidor (5xx), reintentar
        throw new Error(`Server error: ${result.status}`);
      }

      return await result.json();

    } catch (error) {
      if (i === retries - 1) throw error; // Último intento
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
    }
  }
}
```

---

### 3. Sin Logging de Causas de Logout

**Problema**: Cuando ocurre un logout, no se registra la causa exacta.

**Solución propuesta**: Agregar parámetro `reason` a todos los puntos de logout:

```typescript
dispatch(authThunks.signOutThunk({
  reason: 'token_expired',
  details: {
    tokenAge: expirationTime,
    attemptedRefresh: true,
    refreshError: error.message,
  }
}));
```

---

## 📝 Recomendaciones para Investigar el Caso del Usuario

### 1. Logs a Revisar

Si el usuario reporta logouts inesperados, buscar en logs:

```
🧪 [DEBUG] authTokenHasExpired: true (expires in X days)
Auth tokens refresh failed: {"message":"..."}
Token expires soon, refreshing...
🧪 [DEBUG] refreshAuthToken: Fallo en refresh - status: XXX
```

### 2. Preguntas para el Usuario

- ¿Cuánto tiempo pasó desde la última vez que abriste la app?
- ¿Tienes conexión a internet estable cuando ocurre?
- ¿Has cambiado la fecha/hora del dispositivo manualmente?
- ¿Ocurre siempre o solo a veces?
- ¿Qué sistema operativo y versión tienes?

### 3. Testing con Debug Widget

Usar el **DebugTokenWidget** (implementado en este PR) para simular:
- Token expirado (flag `forceTokenExpired`)
- Error en refresh (flag `forceRefreshError`)
- Umbral de refresh personalizado

**Ubicación**: Settings → Debug Screen → Token Expiration Testing

---

## 🎯 Conclusión

### Causas Legítimas de Logout

1. ✅ **Token realmente expirado** (30+ días sin abrir la app)
2. ✅ **Servidor revoca token** (cambio de contraseña, sesión revocada)
3. ✅ **Storage limpiado** (reinstalación, memoria baja)

### Posibles Falsos Positivos

1. ⚠️ **Error de red durante refresh** (sin reintentos)
2. ⚠️ **Reloj del sistema adelantado** (validación local vs servidor)
3. ⚠️ **Logout prematuro sin intentar refresh** (problema en `silentSignInThunk`)

### Mejoras Propuestas

1. Implementar la mejora en `silentSignInThunk()` para intentar refresh antes de logout
2. Agregar reintentos con backoff exponencial en errores de red
3. Implementar logging detallado de causas de logout
4. Agregar telemetría para monitorear frecuencia de logouts inesperados

---

**Elaborado por**: Claude Code
**Revisión recomendada**: Equipo de autenticación y backend
