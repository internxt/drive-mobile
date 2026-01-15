# Migración a i18next - Guía de Uso

## ✅ Migración Completada

La migración de `react-native-localization` a `i18next` ha sido completada exitosamente. El archivo `strings.ts` ahora usa i18next internamente mientras mantiene compatibilidad con el código existente.

## Formas de Usar las Traducciones

### 1. **Uso Tradicional (Compatibilidad Mantenida)**
```typescript
import strings from 'assets/lang/strings';

// Acceso directo a traducciones
const title = strings.buttons.cancel;
const message = strings.generic.loading;

// Formateo de strings con parámetros
const formatted = strings.formatString(strings.messages.itemsMoved, 5);

// Cambio de idioma
strings.setLanguage('es');
```

### 2. **Uso Moderno con Hooks (Recomendado para Componentes)**
```typescript
import { useTranslation } from 'react-i18next';

function MyComponent() {
  const { t } = useTranslation();
  
  return (
    <Text>{t('buttons.cancel')}</Text>
    <Text>{t('messages.itemsMoved', { 0: 5 })}</Text>
  );
}
```

### 3. **Uso Directo de i18next (Para Utilidades/Sagas)**
```typescript
import { t } from 'assets/lang/strings';
// o
import { i18n } from 'assets/lang/strings';

// Función helper exportada
const message = t('buttons.cancel');

// Instancia directa de i18n
const message2 = i18n.t('buttons.cancel');
```

## Cambios Realizados

### ✅ Archivo `assets/lang/strings.ts`
- ✅ Eliminado `react-native-localization`
- ✅ Implementado proxy para mantener compatibilidad con sintaxis `strings.section.key`
- ✅ Exportado instancia de i18n y función helper `t()`
- ✅ Mantenido método `formatString()` para compatibilidad
- ✅ Soporte para sintaxis `{0}` y `{{0}}`

### ✅ Archivos de Idioma
- ✅ `assets/lang/en.ts` - Traducciones en inglés con sintaxis i18next
- ✅ `assets/lang/es.ts` - Traducciones en español con sintaxis i18next
- ✅ Sintaxis actualizada de `{0}` a `{{0}}` para i18next

### ✅ Configuración i18next
- ✅ `src/i18n/index.ts` - Configuración completa de i18next
- ✅ Compatibilidad con React Native (compatibilityJSON: 'v4')
- ✅ Detección automática de idioma del dispositivo
- ✅ Fallback a inglés

## Beneficios de la Migración

1. **✅ Compatibilidad con Expo 54 y Hermes**
2. **✅ Mejor rendimiento** - i18next es más eficiente
3. **✅ Más funcionalidades** - Pluralización, interpolación avanzada, etc.
4. **✅ Mejor soporte para React Native**
5. **✅ Código existente sigue funcionando** - Sin cambios necesarios

## Próximos Pasos (Opcionales)

Para aprovechar al máximo i18next, considera migrar gradualmente a:

1. **Usar `useTranslation()` en componentes nuevos**
2. **Usar la función `t()` en utilidades**
3. **Aprovechar funcionalidades avanzadas como pluralización**

## Ejemplo de Pluralización (Futuro)

```typescript
// En archivos de idioma
{
  "items": {
    "zero": "No items",
    "one": "{{count}} item", 
    "other": "{{count}} items"
  }
}

// En código
const { t } = useTranslation();
const message = t('items', { count: itemCount });
```

## Verificación

Para verificar que todo funciona:

1. ✅ No hay errores de TypeScript
2. ✅ La app compila correctamente
3. ✅ Las traducciones se muestran correctamente
4. ✅ El cambio de idioma funciona
5. ✅ `formatString()` funciona con parámetros

La migración está **COMPLETA** y lista para producción.