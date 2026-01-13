# Plan de Migración a Expo SDK 54

## Estado Actual del Proyecto
- **Expo SDK**: 50.0.21
- **React Native**: 0.73.6
- **React**: 18.2.0
- **Node**: >=16.16.0
- **Branch actual**: feature/PB-5619-update-project-dependencies

## Objetivo
Actualizar a **Expo SDK 54** que incluye:
- **React Native**: 0.81.x
- **React**: 19.1.0
- **Nueva Arquitectura** habilitada por defecto

---

## FASE 1: PREPARACIÓN Y BACKUP

### 1.1 Crear Backup del Estado Actual
```bash
# Crear nueva rama para la migración
git checkout -b feature/expo-54-migration

# Commit del estado actual
git add .
git commit -m "chore: checkpoint before Expo 54 migration"
```

### 1.2 Verificar Estado del Proyecto
- [x] Proyecto actualmente en Expo 50.0.21
- [x] Carpetas nativas android/ e ios/ presentes (proyecto no-CNG)
- [x] Archivos modificados: `ios/Internxt.xcodeproj/project.pbxproj`
- [ ] Verificar que todas las pruebas pasen
- [ ] Verificar que el build actual funcione

### 1.3 Documentar Dependencias Críticas
Revisar compatibilidad de:
- ✅ `@realm/react: 0.4.1` → **PROBLEMA**: Realm 11.3.1 no tiene soporte confirmado para RN 0.81
- ✅ `react-native-reanimated: 3.6.2` → **PROBLEMA**: SDK 54 requiere Reanimated 4.1.x
- ✅ `@internxt` packages → Verificar compatibilidad con nueva arquitectura
- ✅ `react-native-video: 6.6.4` → Verificar soporte RN 0.81
- ✅ `detox: 19.7.0` → Verificar compatibilidad

---

## FASE 2: BREAKING CHANGES CRÍTICOS

### 2.1 Configuración App Config (app.config.ts)
**PROBLEMA CRÍTICO**: Expo SDK 54 depreca `androidStatusBar` y `androidNavigationBar` en raíz.

**Acción requerida**:
```typescript
// ELIMINAR de app.config.ts (líneas 93-100):
androidStatusBar: {
  barStyle: 'light-content',
  backgroundColor: '#091e42',
},
androidNavigationBar: {
  barStyle: 'dark-content',
  backgroundColor: '#091e42',
},
```

**Migración**: Mover configuración a `expo-status-bar` y `expo-navigation-bar` en tiempo de ejecución.

### 2.2 Android Edge-to-Edge
**BREAKING CHANGE**: Todos los apps Android en SDK 54 tienen edge-to-edge habilitado por defecto (no se puede deshabilitar).

**Acciones requeridas**:
1. Revisar todos los componentes que usan `SafeAreaView`
2. Asegurar que usan `react-native-safe-area-context` (ya instalado v4.8.2)
3. Probar layouts en Android con edge-to-edge
4. Ajustar padding/margins si es necesario

### 2.3 Nueva Arquitectura por Defecto
React Native 0.81 habilita la Nueva Arquitectura por defecto.

**Opciones**:
- **Opción A (Recomendada)**: Migrar a Nueva Arquitectura
- **Opción B (Temporal)**: Deshabilitar temporalmente
  ```properties
  # android/gradle.properties
  newArchEnabled=false

  # iOS - en Podfile.properties.json
  { "newArchEnabled": "false" }
  ```

### 2.4 Icons Cuadrados
SDK 54 requiere que todos los iconos sean perfectamente cuadrados.

**Acción requerida**:
- Verificar `./assets/icon-ios.png` (1024x1024)
- Verificar `./assets/icon-android.png` (1024x1024)
- Verificar `./assets/images/splash.png`

---

## FASE 3: ACTUALIZACIÓN DE DEPENDENCIAS

### 3.1 Actualizar Expo CLI y Core
```bash
# Actualizar Expo CLI globalmente
npm install -g expo-cli@latest

# Actualizar SDK de Expo
npx expo install expo@latest

# Dejar que Expo actualice dependencias automáticamente
npx expo install --fix
```

### 3.2 Actualizar Dependencias Problemáticas

#### 3.2.1 React Native Reanimated (CRÍTICO)
```bash
# Reanimated 3.6.2 → 4.1.x
npx expo install react-native-reanimated@latest

# Instalar react-native-worklets (requerido para Reanimated 4)
npm install react-native-worklets@^0.4.0
```

**Migración de código**:
- Revisar documentación de migración 3.x → 4.x
- `babel.config.js` se maneja automáticamente por `babel-preset-expo`
- Probar animaciones críticas

#### 3.2.2 Realm Database (CRÍTICO)
```bash
# Realm 11.3.1 → 12.13.2+ (mínimo para RN 0.76+)
npm install realm@latest @realm/react@latest
```

**Acciones post-instalación**:
- Revisar CHANGELOG de Realm para breaking changes v11 → v12
- Probar migraciones de esquema
- Verificar queries y sincronización

#### 3.2.3 Eliminar @expo/config-plugins
```bash
# PROBLEMA: No debe instalarse directamente
npm uninstall @expo/config-plugins
```

Usar `expo/config-plugins` como subexport de `expo`.

#### 3.2.4 Actualizar React Native Screens
```bash
# 3.34.0 → 3.29.0 (versión esperada por SDK 54)
npx expo install react-native-screens
```

### 3.3 Actualizar Todos los Paquetes Expo
```bash
npx expo install --fix
```

Esto actualizará automáticamente:
- `expo-*` packages (asset, clipboard, constants, device, etc.)
- `react-native-gesture-handler`
- `react-native-safe-area-context`
- `jest-expo`

### 3.4 Verificar Paquetes Internxt
```bash
# Verificar compatibilidad de paquetes internos
npm list @internxt/lib @internxt/mobile-sdk @internxt/rn-crypto @internxt/sdk
```

**Acción**: Verificar con el equipo si hay actualizaciones necesarias para Nueva Arquitectura.

---

## FASE 4: CONFIGURACIÓN NATIVA

### 4.1 Android

#### 4.1.1 Actualizar build.gradle
```gradle
// android/build.gradle
buildToolsVersion = '35.0.0' // Ya actualizado
compileSdkVersion = 35 // Ya actualizado
targetSdkVersion = 35 // Ya actualizado → Cambiar a 36 para SDK 54
minSdkVersion = 27 // OK

kotlinVersion = '1.8.20' → '2.0.0' // Actualizar para RN 0.81
ndkVersion = "25.1.8937393" → "26.1.10909125" // Actualizar
agp_version = '8.0.0' → '8.7.0' // Actualizar Android Gradle Plugin
```

#### 4.1.2 Gradle Properties
```properties
# android/gradle.properties
# Decidir si habilitar Nueva Arquitectura
newArchEnabled=false # Cambiar a true cuando estés listo
```

### 4.2 iOS

#### 4.2.1 Requisitos de Xcode
- **Mínimo**: Xcode 16.1
- **Recomendado**: Xcode 16.2+

```bash
# Verificar versión de Xcode
xcodebuild -version
```

#### 4.2.2 Actualizar Podfile
El Podfile actual está bien configurado para Expo SDK 54.

Verificar `Podfile.properties.json`:
```json
{
  "newArchEnabled": "false",
  "ios.deploymentTarget": "13.4"
}
```

**Acción**: Considerar actualizar `ios.deploymentTarget` a `14.0` (mínimo de RN 0.81).

#### 4.2.3 Limpiar e Instalar Pods
```bash
cd ios
rm -rf Pods Podfile.lock
pod install --repo-update
cd ..
```

### 4.3 Rendimiento de Build iOS
SDK 54 incluye React Native 0.81 con **XCFrameworks precompilados**.

**Beneficio**: Build times reducen de ~120s a ~10s en builds limpios.

---

## FASE 5: CONFIGURACIÓN DE CÓDIGO

### 5.1 Actualizar babel.config.js
Verificar que incluya soporte para Reanimated 4:
```javascript
module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      'react-native-reanimated/plugin', // Debe estar al final
    ],
  };
};
```

### 5.2 Actualizar TypeScript (opcional)
```bash
# TypeScript 5.9.3 → 5.7.x (última versión estable de 5.x)
npm install typescript@~5.7.0
```

### 5.3 Actualizar Metro Config (si existe)
Verificar compatibilidad con React Native 0.81.

---

## FASE 6: TESTING Y VALIDACIÓN

### 6.1 Limpiar Cache
```bash
# Limpiar todos los caches
rm -rf node_modules
rm -rf ios/Pods ios/Podfile.lock
rm -rf android/build android/app/build
rm -rf .expo

# Reinstalar
npm install
cd ios && pod install && cd ..
```

### 6.2 Ejecutar Verificaciones
```bash
# TypeScript
npm run check-ts

# Linter
npm run lint

# Tests unitarios
npm run test:unit
```

### 6.3 Build de Desarrollo

#### Android
```bash
# Limpiar proyecto Android
cd android && ./gradlew clean && cd ..

# Build development
npx expo run:android
```

#### iOS
```bash
# Build development
npx expo run:ios
```

### 6.4 Testing Manual
- [ ] Autenticación con biometría
- [ ] Subida de archivos
- [ ] Descarga de archivos
- [ ] Previsualización de archivos (PDF, imágenes, videos)
- [ ] Sincronización con Realm
- [ ] Navegación entre pantallas
- [ ] Animaciones (Reanimated)
- [ ] Almacenamiento seguro
- [ ] Deep linking (internxt://, inxt://)
- [ ] Edge-to-edge en Android

### 6.5 Testing E2E (Detox)
```bash
# Verificar compatibilidad de Detox con RN 0.81
npm install detox@latest

# Build y test
npm run test:e2e:build:ios.debug
npm run test:e2e:test:ios.debug
```

---

## FASE 7: OPTIMIZACIONES POST-MIGRACIÓN

### 7.1 Migración a Nueva Arquitectura (Opcional)
Si todo funciona con `newArchEnabled=false`, considerar migrar:

1. Habilitar en configuración
2. Verificar módulos nativos custom
3. Probar funcionalidad completa
4. Aprovechar características de React 19

### 7.2 Actualizar React a 19.1.0
```bash
npx expo install react@19.1.0 react-dom@19.1.0
```

### 7.3 Aprovechar Nuevas Features
- Tabs nativos (beta)
- Streaming support
- Server middleware (experimental)
- Mejoras de rendimiento en iOS builds

---

## FASE 8: PROBLEMAS CONOCIDOS Y SOLUCIONES

### 8.1 Error: react-native-worklets no instalado
```bash
npm install react-native-worklets@^0.4.0
```

### 8.2 Error: Scheme validation failed
**Solución**: Eliminar campos deprecados de `app.config.ts`:
- `androidStatusBar`
- `androidNavigationBar`
- `statusBar` (si existe en raíz)

### 8.3 Build Error en Android con Realm
**Solución**: Actualizar Realm a v12.13.2+

### 8.4 Layouts rotos en Android
**Causa**: Edge-to-edge habilitado
**Solución**: Revisar uso de SafeAreaView y ajustar layouts

### 8.5 Animaciones rotas después de Reanimated 4
**Solución**: Revisar [guía de migración Reanimated 3→4](https://docs.swmansion.com/react-native-reanimated/docs/guides/compatibility/)

---

## ORDEN DE EJECUCIÓN RECOMENDADO

### Paso 1: Preparación (30 min)
1. Crear rama `feature/expo-54-migration`
2. Commit del estado actual
3. Ejecutar tests actuales
4. Documentar funcionamiento actual

### Paso 2: Actualización de Configuración (1 hora)
1. Eliminar `androidStatusBar` y `androidNavigationBar` de `app.config.ts`
2. Verificar iconos cuadrados
3. Desinstalar `@expo/config-plugins`
4. Decidir estrategia Nueva Arquitectura (iniciar con `false`)

### Paso 3: Actualización Core (1-2 horas)
1. `npx expo install expo@latest`
2. `npx expo install --fix`
3. Verificar `package.json` actualizado
4. `npm install`

### Paso 4: Actualización Crítica (2-3 horas)
1. Actualizar Reanimated + worklets
2. Actualizar Realm + @realm/react
3. Revisar breaking changes de cada uno
4. Limpiar caches

### Paso 5: Configuración Nativa (1-2 horas)
1. Actualizar Android build.gradle
2. Actualizar versiones de Kotlin, NDK, AGP
3. Verificar Xcode 16.1+
4. `pod install` en iOS

### Paso 6: Testing (3-4 horas)
1. Builds development Android/iOS
2. Testing manual de features críticas
3. Tests unitarios
4. Tests E2E si aplica
5. Fixes de issues encontrados

### Paso 7: Optimización (opcional)
1. Habilitar Nueva Arquitectura
2. Actualizar a React 19
3. Aprovechar nuevas features

---

## ESTIMACIÓN TOTAL
- **Tiempo mínimo**: 8-10 horas (sin Nueva Arquitectura)
- **Tiempo con Nueva Arquitectura**: 12-16 horas
- **Tiempo con problemas imprevistos**: +20-40%

---

## ROLLBACK PLAN

Si encuentras problemas bloqueantes:

```bash
# Volver al estado anterior
git checkout feature/PB-5619-update-project-dependencies
git branch -D feature/expo-54-migration

# O resetear la rama
git reset --hard HEAD~1
rm -rf node_modules ios/Pods
npm install
cd ios && pod install && cd ..
```

---

## RECURSOS Y DOCUMENTACIÓN

### Documentación Oficial
- [Expo SDK 54 Changelog](https://expo.dev/changelog/sdk-54)
- [Expo SDK 54 Beta](https://expo.dev/changelog/sdk-54-beta)
- [React Native 0.76 Release](https://medium.com/@onix_react/release-react-native-0-76-e06de73e995e)
- [Upgrading to new versions · React Native](https://reactnative.dev/docs/upgrading)

### Herramientas
- [React Native Upgrade Helper](https://react-native-community.github.io/upgrade-helper/)
- [Expo Doctor](https://docs.expo.dev/more/expo-cli/#expo-doctor)

### Guías de Migración
- [Reanimated 3.x to 4.x migration](https://docs.swmansion.com/react-native-reanimated/docs/guides/compatibility/)
- [Realm Compatibility Table](https://github.com/realm/realm-js/blob/main/COMPATIBILITY.md)
- [Upgrading to Expo SDK 54 Common Issues](https://diko-dev99.medium.com/upgrading-to-expo-sdk-54-common-issues-and-how-to-fix-them-1b78ac6b19d3)

---

## NOTAS FINALES

1. **Nueva Arquitectura**: Recomiendo empezar con `newArchEnabled=false` y migrar después de validar que todo funciona.

2. **Reanimated**: La actualización a v4 es obligatoria. Revisar todas las animaciones.

3. **Realm**: Actualización obligatoria a v12.13.2+ para soporte de RN 0.76+.

4. **Android Edge-to-Edge**: No se puede deshabilitar. Revisar todos los layouts.

5. **Paquetes Internxt**: Verificar con el equipo su compatibilidad con Nueva Arquitectura.

6. **Testing**: Dedicar tiempo suficiente a probar todas las funcionalidades críticas.

---

**Última actualización**: 2025-12-29
**Autor**: Claude Code Assistant
**Status**: Plan listo para ejecutar
