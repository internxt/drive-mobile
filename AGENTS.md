# AGENTS.md

Rules for anyone writing or reviewing code in this repository, human or agent.

## Project at a glance

Internxt Drive for iOS and Android: React Native + Expo, TypeScript, Redux Toolkit, React Navigation, tailwind-rn.

```bash
yarn check-ts      # type check
yarn lint          # type check + ESLint
yarn test:unit     # Jest
```

- Never modify `src/@inxt-js/`: it is legacy download code kept only for old files.

## iOS share extension

Applies to `index.share.js`, `src/shareExtension/**` except `*.android.ts(x)`, and every module they import. The iOS extension runs in a separate binary that links fewer native modules than the app. `ShareExtensionView.android.tsx` and `useShareExtension.android.ts` run inside the main app, so these restrictions do not apply to them.

- No imports from re-export barrels (`index.ts` files with `export *`, such as `../../helpers` or `../../services/common`): import the file directly.
- Never import a package listed in the `exclude` array of the `InternxtShareExtension` target in `ios/Podfile`: `react-native-reanimated`, `react-native-screens`, `react-native-gesture-handler`, `react-native-safe-area-context`, `@shopify/flash-list`, `react-native-video`, `react-native-webview`, `react-native-pdf`, `jail-monkey`, `react-native-enriched-html`, `@react-native-community/datetimepicker`, `expo-updates`, `expo-splash-screen`, `expo-dev-*`. `react-native-svg` is in that list too but the extension already uses it.
- Never import `react-native-crypto`: it crashes on `sjcl.init()`.
- Uploads authenticate with `AsyncStorageKey.PhotosToken`, not `Token`.

## Crypto

The JS thread is single-threaded: pure-JS crypto blocks the UI even behind an `async` API.

- PBKDF2 and AES file encryption/decryption in new code must use `@internxt/rn-crypto`.
- Never add a pure-JS iterative KDF: `@noble/hashes` `pbkdf2`/`pbkdf2Async`, `@scure/bip39` `mnemonicToSeed`, `crypto-js` `PBKDF2`, `react-native-crypto` `pbkdf2Sync`.
- `@noble/hashes` is fine for a single hash over a small buffer or for random bytes.
- `src/helpers/aesUtils.ts`, `src/helpers/crypt/crypt.ts` and `src/services/NetworkService/download.ts` are legacy: do not flag them unless the PR changes them.

## Storage and logout

- Go through `asyncStorageService` and `secureStorageService`; never call `AsyncStorage` or `SecureStore` directly.
- `asyncStorageService.saveItem` stores keys listed in `SENSITIVE_KEYS` (`src/services/AsyncStorageService.ts`) in SecureStore and every other key in AsyncStorage.
- Every user-specific key must be wiped on logout by `clearStorage()` in the same file. A secret value (tokens, user, keys) goes in `SENSITIVE_KEYS`; any other user-specific value goes in the `nonSensitiveKeys` list inside `clearStorage()`. Device-specific keys go in neither.

## Local file URIs

- A path the app generated (cache, documents, download, temp copy) must go through `fileSystemService.pathToUri(path)` before it is used as a `source` of `Image`, `Video` or any other component.
- URIs from the OS (`content://`, `ph://`, `expo-media-library` assets) are already valid: never pass them through `pathToUri`.
- `driveFileService.getThumbnail`, `PhotoAssetFetchService.fetchUri` and `imageService.getCachedImage` already return a usable URI: do not convert their result again.
- Inside the iOS share extension use `toDisplayUri` from `src/shareExtension/utils.ts`, not `fileSystemService`.
- `toFileUri` (`src/services/common/uri/uriHelpers.ts`) adds `file://` on both platforms. It is for native APIs that require a `file://` URI (sharing, saving to the media library, expo-file-system, image manipulation, PDF thumbnails), never for an `Image` or `Video` `source`.

## i18n

- Never read `strings.*` at module scope (module constants, default parameter values): `setLanguage` replaces the contents of the `strings` object, so a value read at import time keeps the previous language. Read it inside the component or function.
- No hardcoded user-facing text.

## Styles

- Every class passed to `tailwind('…')` must exist in `src/styles/tailwind.json`; tailwind-rn silently drops unknown classes. Anything missing must be written as an explicit style.

## Photos local database

- The Photos SQLite tables (`asset_sync`, `cloud_asset`) are already on users' devices and there is no migration mechanism. Adding a table or index is fine; adding, changing or removing a column of an existing table is a blocker until a migration path exists.
- `photosLocalDB.spec.ts` asserts the exact number of statements `init()` runs: a new table or index must update it.

## Dependencies

- Add native or Expo dependencies with `yarn expo install <pkg>`, not `yarn add`. Never use npm or npx.
- Changes to `node_modules` go through `patch-package`.

## Code conventions

- Arrow functions only, never `function` declarations.
- No unnamed numeric literals other than 0 and 1: give sizes, durations, opacities and the like a named constant. HTTP status codes come from `src/services/common/httpStatusCodes.ts`.
- `if` always has braces, also for a single `return`, `throw`, `continue` or `break`.
- New variables have no abbreviations (`btn`, `idx`, `res`) and no generic names (`data`, `item`, `result`). Boolean state uses `is`/`has`/`can`/`should`; JSX props follow platform naming (`disabled`, `active`). Functions start with a verb.
- New error classes go in the domain's `errors.ts` (e.g. `src/services/photos/errors.ts`), which holds only error classes. Cross-cutting errors go in `src/services/common/errors/base.ts`.
- Import types at the top of the file; no inline `as import('…')` casts.
- A value or callback that would cross a component that does not use it goes through a narrow screen-scoped React Context, not props.
- JSDoc describes what a function does, not why it was designed that way. Omit it on short self-explanatory functions.

## Tests

- Test files are `*.spec.ts(x)`; Jest ignores `*.test.*`.
- Use `test()`, not `it()`.
- `test` and `describe` names are plain English sentences, `when <situation>, then <outcome>`, with no function, variable or type names and no real people's names.
  - ✅ `when a previously synced photo has been edited on the device, then it is re-queued for sync`
  - ❌ `when a synced asset has a newer modificationTime on device, then it is returned as pending`

## Before finishing a task

- `yarn lint` and `yarn test:unit` pass.
- Every new behavior has a test in a `*.spec.ts(x)` file.

## For CodeRabbit specifically

- Prioritize the rules above that prevent bugs: iOS share extension, crypto, storage, URIs, i18n, styles and the Photos database. Report code conventions and test naming as nitpicks.
- Do not repeat what ESLint reports and do not comment on formatting.
- Review only the changed code. Do not suggest renaming or reformatting existing code the PR does not touch.
