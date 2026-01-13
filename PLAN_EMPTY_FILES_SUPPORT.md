# Plan de Implementación: Soporte para Archivos Vacíos en Drive Mobile

## Contexto

Este plan detalla los cambios necesarios para implementar el soporte de archivos vacíos (0 bytes) en drive-mobile, basándose en el PR [#1782](https://github.com/internxt/drive-web/pull/1782) de drive-web.

**Objetivo**: Permitir que los usuarios puedan crear y subir archivos vacíos en la aplicación móvil.

---

## Comparación: Versiones de SDK

| Plataforma | Versión Actual | Versión en PR Web | Requiere Update |
|------------|----------------|-------------------|-----------------|
| drive-web  | `1.11.17` → `1.11.23` | `1.11.23` | ✅ Actualizado |
| drive-mobile | `1.11.6` | - | ⚠️ **Requiere actualización a 1.11.23+** |

**Acción Crítica**: Actualizar `@internxt/sdk` de `1.11.6` a `1.11.23` para soportar archivos vacíos.

---

## Cambios Necesarios

### 1. Actualización de Dependencias

**Archivo**: [`package.json`](package.json#L40)

**Cambio**:
```diff
- "@internxt/sdk": "=1.11.6",
+ "@internxt/sdk": "=1.11.23",
```

**Justificación**: El SDK actualizado incluye soporte para crear file entries sin necesidad de subir contenido real para archivos de 0 bytes.

---

### 2. Creación de Archivo de Errores Personalizados

**Archivo**: `src/services/drive/file/utils/upload.errors.ts` (NUEVO)

**Contenido**:
```typescript
import { FileToUpload } from './prepareFilesToUpload';

export class FileIdRequiredError extends Error {
  constructor() {
    super('File ID is required when uploading a file');
    this.name = 'FileIdRequiredError';
    Object.setPrototypeOf(this, FileIdRequiredError.prototype);
  }
}

export class BucketNotFoundError extends Error {
  constructor() {
    super('Bucket not found');
    this.name = 'BucketNotFoundError';
    Object.setPrototypeOf(this, BucketNotFoundError.prototype);
  }
}

export class RetryableFileError extends Error {
  constructor(public file: FileToUpload) {
    super('Retryable file');
    this.name = 'RetryableFileError';
    Object.setPrototypeOf(this, RetryableFileError.prototype);
  }
}
```

**Justificación**: Errores tipados específicos para el proceso de upload, siguiendo el patrón del PR de drive-web.

---

### 3. Remover Filtrado de Archivos Vacíos

#### 3.1. Archivo: [`src/services/drive/file/utils/processDuplicateFiles.ts`](src/services/drive/file/utils/processDuplicateFiles.ts)

**Cambios**:

```diff
export const processDuplicateFiles = async ({
  files,
  existingFilesToUpload,
  parentFolderUuid,
  disableDuplicatedNamesCheck,
  duplicatedFiles,
}: ProcessDuplicateFilesParams): Promise<{
  newFilesToUpload: FileToUpload[];
- zeroLengthFiles: number;
}> => {
- const zeroLengthFiles = files.filter((file) => file.size === 0).length;
  const newFilesToUpload: FileToUpload[] = [...existingFilesToUpload];

  const processFile = async (file: DocumentPickerFile): Promise<void> => {
-   if (file.size === 0) return;

    const { plainName, extension } = getFilenameAndExt(file.name);
    let finalFilename = plainName;

    if (!disableDuplicatedNamesCheck && duplicatedFiles) {
      finalFilename = await getUniqueFilename(plainName, extension, duplicatedFiles, parentFolderUuid);
    }

    newFilesToUpload.push({
      name: finalFilename,
      size: file.size,
      type: extension ?? file.type ?? '',
      uri: file.uri,
      parentUuid: parentFolderUuid,
      modificationTime: file.modificationTime ?? undefined,
      creationTime: file.creationTime ?? undefined,
    });
  };

- await Promise.all(files.filter((file) => file.size > 0).map(processFile));
+ await Promise.all(files.map(processFile));

- return { newFilesToUpload, zeroLengthFiles };
+ return { newFilesToUpload };
};
```

**Cambios clave**:
- Eliminar el contador `zeroLengthFiles`
- Remover el filtro que excluye archivos de 0 bytes en línea 29
- Remover el filtro en `Promise.all` (línea 49)
- Actualizar el tipo de retorno

---

#### 3.2. Archivo: [`src/services/drive/file/utils/prepareFilesToUpload.ts`](src/services/drive/file/utils/prepareFilesToUpload.ts)

**Cambios**:

```diff
export const prepareFilesToUpload = async ({
  files,
  parentFolderUuid,
  disableDuplicatedNamesCheck = false,
  disableExistenceCheck = false,
}: {
  files: DocumentPickerFile[];
  parentFolderUuid: string;
  disableDuplicatedNamesCheck?: boolean;
  disableExistenceCheck?: boolean;
-}): Promise<{ filesToUpload: FileToUpload[]; zeroLengthFilesNumber: number }> => {
+}): Promise<{ filesToUpload: FileToUpload[] }> => {
  let filesToUpload: FileToUpload[] = [];
- let zeroLengthFilesNumber = 0;

  const processFiles = async (
    filesBatch: DocumentPickerFile[],
    disableDuplicatedNamesCheckOverride: boolean,
    duplicatedFiles?: DriveFileData[],
  ) => {
-   const { zeroLengthFiles, newFilesToUpload } = await processDuplicateFiles({
+   const { newFilesToUpload } = await processDuplicateFiles({
      files: filesBatch,
      existingFilesToUpload: filesToUpload,
      parentFolderUuid,
      disableDuplicatedNamesCheck: disableDuplicatedNamesCheckOverride,
      duplicatedFiles,
    });

    filesToUpload = newFilesToUpload;
-   zeroLengthFilesNumber += zeroLengthFiles;
  };

  const processFilesBatch = async (filesBatch: DocumentPickerFile[]) => {
    if (disableExistenceCheck) {
      await processFiles(filesBatch, true);
    } else {
      const mappedFiles = filesBatch.map((f) => ({
        name: f.name,
        uri: f.uri,
        size: f.size,
        type: f.type ?? '',
        modificationTime: f.modificationTime,
        creationTime: f.creationTime,
      }));

      const { duplicatedFilesResponse, filesWithoutDuplicates, filesWithDuplicates } = await checkDuplicatedFiles(
        mappedFiles,
        parentFolderUuid,
      );

      await processFiles(filesWithoutDuplicates as DocumentPickerFile[], true);
      await processFiles(
        filesWithDuplicates as DocumentPickerFile[],
        disableDuplicatedNamesCheck,
        duplicatedFilesResponse,
      );
    }
  };

  // Process files in batches
  for (let i = 0; i < files.length; i += BATCH_SIZE) {
    const batch = files.slice(i, i + BATCH_SIZE);
    await processFilesBatch(batch);
  }

- return { filesToUpload, zeroLengthFilesNumber };
+ return { filesToUpload };
};
```

**Cambios clave**:
- Remover `zeroLengthFilesNumber` del retorno
- Eliminar la lógica de conteo de archivos vacíos

---

### 4. Lógica de Upload para Archivos Vacíos

#### 4.1. Archivo: [`src/services/drive/file/utils/uploadFileUtils.ts`](src/services/drive/file/utils/uploadFileUtils.ts)

**Nuevas funciones a agregar**:

```typescript
import { BucketNotFoundError, FileIdRequiredError } from './upload.errors';
import { DriveFileData, FileEntryByUuid } from '@internxt/sdk/dist/drive/storage/types';

interface CreateFileEntryParams {
  bucketId: string;
  fileId?: string;
  file: {
    name: string;
    size: number;
    type: string;
    parentUuid: string;
  };
}

/**
 * Utility to check if a file is empty (0 bytes)
 */
export function isFileEmpty(file: { size: number }): boolean {
  return file.size === 0;
}

/**
 * Create a file entry without uploading content (for empty files)
 */
export async function createFileEntry({
  bucketId,
  fileId,
  file,
}: CreateFileEntryParams): Promise<DriveFileData> {
  const date = new Date();
  const { sdk } = SdkManager.getInstance();

  const fileEntry: FileEntryByUuid = {
    fileId: fileId,
    type: file.type,
    size: file.size,
    plainName: file.name,
    bucket: bucketId,
    folderUuid: file.parentUuid,
    encryptVersion: EncryptionVersion.Aes03,
    modificationTime: date.toISOString(),
    date: date.toISOString(),
  };

  return sdk.storageV2.createFileEntryByUuid(fileEntry);
}
```

**Modificar función de upload en AddModal** (o donde se gestione el upload principal):

El componente que llama al upload debe verificar si el archivo está vacío antes de intentar subirlo:

```typescript
// Dentro de la función de upload principal
export async function uploadSingleFile(
  file: UploadingFile,
  dispatch: Dispatch<any>,
  uploadFile: (uploadingFile: UploadingFile, fileType: 'document' | 'image') => Promise<void>,
  uploadSuccess: (file: UploadingFile) => void,
) {
  try {
    // Si el archivo está vacío, crear entrada directamente
    if (isFileEmpty(file)) {
      const { bridgeUser, bridgePass, encryptionKey, bucketId } = await getEnvironmentConfig();

      if (!bucketId) {
        throw new BucketNotFoundError();
      }

      await createFileEntry({
        bucketId,
        file: {
          name: file.name,
          size: file.size,
          type: file.type,
          parentUuid: file.parentUuid,
        },
      });

      uploadSuccess(file);
    } else {
      // Lógica normal de upload para archivos con contenido
      await uploadFile(file, 'document');
      uploadSuccess(file);
    }
  } catch (e) {
    const err = e as Error;
    errorService.reportError(err, {
      extra: {
        fileId: file.id,
      },
    });
    trackUploadError(file, err);
    dispatch(driveActions.uploadFileFailed({ errorMessage: err.message, id: file.id }));
    logger.error('File upload process failed: ', JSON.stringify(err));
    notificationsService.show({
      type: NotificationType.Error,
      text1: strings.formatString(strings.errors.uploadFile, err.message) as string,
    });
  } finally {
    dispatch(driveActions.uploadFileFinished());
  }
}
```

---

### 5. Actualizar Llamadas a `prepareFilesToUpload`

**Archivos afectados**:
- [`src/components/modals/AddModal/index.tsx`](src/components/modals/AddModal/index.tsx)
- Cualquier otro lugar que llame a `prepareFilesToUpload`

**Cambio**:
```diff
- const { filesToUpload, zeroLengthFilesNumber } = await prepareFilesToUpload({
+ const { filesToUpload } = await prepareFilesToUpload({
    files,
    parentFolderUuid: folderUuid,
    disableDuplicatedNamesCheck: false,
    disableExistenceCheck: false,
  });

- // Remover cualquier lógica que use zeroLengthFilesNumber
- if (zeroLengthFilesNumber > 0) {
-   // mostrar notificación
- }
```

---

### 6. Actualizar Validación de Tamaño en Upload Manager (Opcional)

**Archivo**: No existe un `UploadManager.ts` directo en mobile como en web, pero si hay alguna validación de tamaño mínimo:

**Revisar**:
- [`src/network/upload.ts`](src/network/upload.ts)
- Cualquier constante de tamaño mínimo

**Acción**: Asegurar que no hay validación que rechace archivos de 0 bytes.

---

## Tests Necesarios

### 1. Tests para `processDuplicateFiles.ts`

Crear: `src/services/drive/file/utils/processDuplicateFiles.test.ts`

**Casos de prueba**:
1. ✅ Procesar archivo vacío sin verificación de duplicados
2. ✅ Procesar archivo vacío con verificación de duplicados y renombrado
3. ✅ Procesar múltiples archivos incluyendo vacíos
4. ✅ Verificar que archivos vacíos se procesan igual que archivos con contenido

### 2. Tests para `uploadFileUtils.ts`

Actualizar: Tests existentes o crear nuevos

**Casos de prueba**:
1. ✅ Verificar que `isFileEmpty()` detecta correctamente archivos de 0 bytes
2. ✅ Crear file entry para archivo vacío sin subir contenido
3. ✅ Error cuando no hay bucketId al intentar crear file entry
4. ✅ Verificar que archivos vacíos no pasan por proceso de upload de red

### 3. Tests para flujo completo

**Casos de prueba**:
1. ✅ Seleccionar y subir archivo vacío desde document picker
2. ✅ Verificar que no se muestran notificaciones de error para archivos vacíos
3. ✅ Verificar que archivos vacíos aparecen en la lista después de "subir"

---

## Archivos a Modificar/Crear

| Archivo | Acción | Prioridad |
|---------|--------|-----------|
| `package.json` | Modificar | 🔴 Alta |
| `src/services/drive/file/utils/upload.errors.ts` | Crear | 🔴 Alta |
| `src/services/drive/file/utils/processDuplicateFiles.ts` | Modificar | 🔴 Alta |
| `src/services/drive/file/utils/prepareFilesToUpload.ts` | Modificar | 🔴 Alta |
| `src/services/drive/file/utils/uploadFileUtils.ts` | Modificar | 🔴 Alta |
| `src/components/modals/AddModal/index.tsx` | Modificar | 🟡 Media |
| `src/services/drive/file/utils/processDuplicateFiles.test.ts` | Crear | 🟢 Baja |
| `src/services/drive/file/utils/uploadFileUtils.test.ts` | Crear/Modificar | 🟢 Baja |

---

## Orden de Implementación Recomendado

1. **Actualizar SDK** (`package.json`)
   - Correr `yarn install` o `npm install`
   - Verificar compatibilidad

2. **Crear errores personalizados** (`upload.errors.ts`)
   - Nuevos tipos de error
   - Sin dependencias

3. **Modificar procesamiento de archivos**
   - `processDuplicateFiles.ts`
   - `prepareFilesToUpload.ts`
   - Remover filtrado de archivos vacíos

4. **Implementar lógica de upload para archivos vacíos**
   - `uploadFileUtils.ts`
   - Agregar `isFileEmpty()` y `createFileEntry()`

5. **Actualizar componente principal**
   - `AddModal/index.tsx`
   - Integrar nueva lógica

6. **Escribir tests**
   - Tests unitarios
   - Tests de integración

7. **Testing manual**
   - Probar en iOS
   - Probar en Android
   - Casos edge: duplicados, errores de red, etc.

---

## Consideraciones Especiales para Mobile

### Diferencias con drive-web

1. **No hay soporte de Workspaces en mobile (actualmente)**
   - No necesitamos implementar la lógica de `isWorkspaceUpload`
   - Simplificar `createFileEntry()` solo para uploads personales

2. **File URIs en lugar de File objects**
   - Mobile usa `uri` (string) en lugar de `File` objects
   - La verificación de tamaño se hace con `file.size` que ya viene del document picker

3. **Sin UploadManager centralizado**
   - Web tiene un `UploadManager` con concurrency management
   - Mobile gestiona uploads de forma más directa
   - No necesitamos modificar límites de concurrencia

### Casos Edge a Considerar

1. **Permisos de almacenamiento**
   - Archivos vacíos deberían funcionar igual
   - No hay lectura real de contenido

2. **Límites de almacenamiento**
   - Archivos de 0 bytes no deberían consumir cuota
   - Verificar cálculo de espacio usado

3. **Comportamiento de thumbnails**
   - Archivos vacíos probablemente no tienen thumbnail
   - Manejar gracefully

4. **Sincronización offline**
   - ¿Qué pasa si se intenta crear archivo vacío sin conexión?
   - Debería quedar en cola como cualquier otro archivo

---

## Riesgos y Mitigación

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| Incompatibilidad SDK 1.11.23 | Media | Alto | Revisar changelog, testear exhaustivamente |
| Comportamiento diferente iOS vs Android | Media | Medio | Testear en ambas plataformas |
| Regression en upload de archivos normales | Baja | Alto | Suite de tests completa, QA manual |
| Backend no soporta archivos vacíos | Baja | Alto | Verificar con backend/API antes de implementar |

---

## Criterios de Aceptación

- ✅ Los usuarios pueden seleccionar y "subir" archivos de 0 bytes
- ✅ Los archivos vacíos aparecen en la lista de archivos correctamente
- ✅ No se muestran errores o advertencias para archivos vacíos
- ✅ El proceso de upload de archivos normales (> 0 bytes) no se ve afectado
- ✅ Los archivos vacíos se pueden descargar posteriormente
- ✅ La funcionalidad está probada en iOS y Android
- ✅ Los tests unitarios cubren los nuevos casos

---

## Referencias

- PR Original (drive-web): https://github.com/internxt/drive-web/pull/1782
- Issue relacionado: PB-4948
- SDK Release Notes: Verificar cambios entre 1.11.6 y 1.11.23

---

## Notas Adicionales

- Este cambio requiere coordinación con backend para asegurar que la API soporta crear file entries sin upload de contenido
- Considerar actualizar documentación de usuario si es necesario
- Verificar comportamiento con otras plataformas (desktop, CLI) para consistencia

---

**Última actualización**: 2025-12-23
**Autor**: Claude Code (basado en análisis de PR #1782)
