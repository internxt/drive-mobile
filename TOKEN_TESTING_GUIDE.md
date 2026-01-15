# 🧪 Guía de Testing de Expiración de Tokens

## Descripción

Este sistema te permite simular diferentes escenarios de expiración de tokens para testing, sin necesidad de esperar a que los tokens realmente expiren.

## Ubicación

**DebugScreen** → Accesible desde **Settings** (solo en modo desarrollo)

## Funcionalidades Implementadas

### 1. Flags de Simulación

#### 🔴 **Token Expirado (logout)**
- **Activar:** Hace que `authTokenHasExpired()` siempre retorne `true`
- **Efecto:** Al activar y luego reabrir la app (o traerla de background), se ejecutará `silentSignInThunk()` y detectará tokens expirados → **logout automático**
- **Uso:** Para testear el flujo completo de logout por token expirado

#### 🟡 **Necesita Refresh**
- **Activar:** Hace que `tokenNeedsRefresh()` siempre retorne `true`
- **Efecto:** La próxima vez que se ejecute `checkAndRefreshTokenThunk()`, intentará refrescar los tokens inmediatamente
- **Uso:** Para testear el flujo de refresh de tokens

#### 🔴 **Refresh Falla (error)**
- **Activar:** Hace que `refreshAuthToken()` siempre lance un error
- **Efecto:** Cuando se intente refrescar, fallará y ejecutará el flujo de logout por token inválido
- **Uso:** Para testear qué pasa cuando el servidor rechaza el refresh

### 2. Umbrales Personalizados

Cambia el tiempo de anticipación para considerar que un token "necesita refresh":

- **30 segundos** - Para testing inmediato
- **5 minutos** - Para testing rápido
- **1 hora** - Para testing a corto plazo
- **1 día** - Para testing a medio plazo
- **Default (3 días)** - Comportamiento normal de producción

**Ejemplo:** Si seleccionas "30 segundos", un token que expire en 25 segundos será considerado como "necesita refresh".

### 3. Acciones Manuales

#### ▶️ **Check & Refresh**
- Ejecuta `checkAndRefreshTokenThunk()`
- Verifica si el token necesita refresh según el umbral configurado
- Si necesita, ejecuta el refresh automáticamente

#### ▶️ **Force Refresh**
- Ejecuta `refreshTokensThunk()` directamente
- Refresca los tokens sin verificar si es necesario
- Útil para testear el proceso de refresh inmediatamente

#### 🔄 **Reset All Flags**
- Restaura todos los flags a sus valores por defecto
- Útil para volver al comportamiento normal

## Logs de Debugging

Todos los métodos ahora incluyen logs detallados (solo en `__DEV__` mode):

### `authTokenHasExpired()`
```
🧪 [DEBUG] authTokenHasExpired: false (expires in 15.23 days)
```

### `tokenNeedsRefresh()`
```
🧪 [DEBUG] tokenNeedsRefresh: true (expires in 2.45h, threshold: 72.00h)
```

### `refreshAuthToken()`
```
🧪 [DEBUG] refreshAuthToken: Iniciando refresh de tokens...
🧪 [DEBUG] refreshAuthToken: ✅ Tokens refrescados exitosamente
```

## Flujos de Testing Comunes

### 📝 Caso 1: Testear Logout por Token Expirado

1. Abre **Debug Screen**
2. Activa **"Token Expirado (logout)"**
3. Cierra la app o ponla en background
4. Vuelve a abrir la app
5. **Resultado esperado:** Logout automático + pantalla de login

### 📝 Caso 2: Testear Refresh Automático

1. Abre **Debug Screen**
2. Activa **"Necesita Refresh"**
3. Presiona **"Check & Refresh"**
4. Observa los logs en la consola
5. **Resultado esperado:** Tokens refrescados exitosamente

### 📝 Caso 3: Testear Error en Refresh → Logout

1. Abre **Debug Screen**
2. Activa **"Necesita Refresh"**
3. Activa **"Refresh Falla (error)"**
4. Presiona **"Force Refresh"**
5. **Resultado esperado:** Error + logout automático

### 📝 Caso 4: Testear Umbral Personalizado

1. Abre **Debug Screen**
2. Selecciona umbral **"30 seg"**
3. Presiona **"Check & Refresh"**
4. Observa el log: mostrará el tiempo hasta expiración vs. el umbral
5. **Resultado esperado:** Si el token expira en menos de 30s, se refrescará

### 📝 Caso 5: Testear Refresh al Reactivar App

1. Abre **Debug Screen**
2. Selecciona umbral **"1 día"** (o el que prefieras)
3. Pon la app en background
4. Trae la app al foreground
5. **Resultado esperado:** `checkAndRefreshTokenThunk()` se ejecuta automáticamente (ver App.tsx:79)

## Puntos de Ejecución Automática

El sistema ejecuta verificaciones automáticamente en estos momentos:

### ✅ Al Iniciar la App
```typescript
// App.tsx línea 66
await dispatch(authThunks.refreshTokensThunk());
```

### ✅ Al Reactivar la App (background → foreground)
```typescript
// App.tsx línea 79
dispatch(authThunks.checkAndRefreshTokenThunk());
```

### ✅ En Silent Sign In
```typescript
// auth/index.ts línea 71-74
const newTokenIsExpired = authService.authTokenHasExpired(credentials.photosToken);
const tokenIsExpired = authService.authTokenHasExpired(credentials.accessToken);
```

## Archivos Modificados

1. **[AuthService.ts](src/services/AuthService.ts)** - Agregados flags de debug y logs
2. **[DebugTokenWidget/index.tsx](src/components/DebugTokenWidget/index.tsx)** - Nuevo widget de control
3. **[DebugScreen/index.tsx](src/screens/DebugScreen/index.tsx)** - Agregado widget al screen

## Notas Importantes

⚠️ **Estos flags solo funcionan en modo desarrollo (`__DEV__ = true`)**

⚠️ **Los flags son volátiles:** Se resetean al recargar la app (hot reload). Esto es intencional para evitar dejar flags activos por error.

⚠️ **Los logs solo aparecen en modo desarrollo**

⚠️ **Recuerda resetear los flags después de terminar el testing**

## Ejemplos de Logs Esperados

### Escenario: Token Válido (sin flags activos)
```
🧪 [DEBUG] authTokenHasExpired: false (expires in 29.87 days)
🧪 [DEBUG] tokenNeedsRefresh: false (expires in 717.12h, threshold: 72.00h)
```

### Escenario: Token Necesita Refresh (flag activo)
```
🧪 [DEBUG] tokenNeedsRefresh: FORCED TO TRUE (simulating token needs refresh)
🧪 [DEBUG] refreshAuthToken: Iniciando refresh de tokens...
🧪 [DEBUG] refreshAuthToken: ✅ Tokens refrescados exitosamente
```

### Escenario: Token Expirado (flag activo)
```
🧪 [DEBUG] authTokenHasExpired: FORCED TO TRUE (simulating expired token)
[...logout automático...]
```

### Escenario: Refresh Fallido (flag activo)
```
🧪 [DEBUG] refreshAuthToken: FORCED ERROR (simulating refresh failure)
Auth tokens refresh failed: {"message":"Tokens no longer valid, should sign out"}
[...logout automático...]
```

## Troubleshooting

### No veo el Debug Screen
- Verifica que `appService.isDevMode` esté en `true`
- Verifica que estés corriendo la app en modo desarrollo

### Los logs no aparecen
- Verifica que `__DEV__` esté en `true`
- Revisa la consola de Metro (donde corre el bundler)

### Los flags no tienen efecto
- Verifica que hayas presionado el botón (debe cambiar de color)
- Recuerda que algunos flags requieren acciones adicionales (ej: "Check & Refresh")

### La app se cierra al activar "Token Expirado"
- Esto es **comportamiento esperado** si el token realmente estaba cerca de expirar
- Intenta con "Necesita Refresh" primero para refrescar los tokens

---

**Desarrollado para:** Drive Mobile - Internxt
**Fecha:** Diciembre 2024
**Propósito:** Testing y debugging de flujos de expiración de tokens
