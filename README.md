[![Build Status](https://travis-ci.com/internxt/drive-mobile.svg?branch=master)](https://travis-ci.com/internxt/drive-mobile)
![GitHub](https://img.shields.io/github/license/internxt/drive-mobile)

# Internxt Drive Mobile

<p align="center">
  <img src="./assets/icon.png?raw=true" style="width: 200px; max-width: 200px" />
</p>
<p align="center" style="margin-top: 10px;">Internxt</p>

## Stack

- React Native 0.81.5 · Expo 54 · React 19 · TypeScript 5.9
- State management: Redux Toolkit
- Navigation: React Navigation 6
- Styling: tailwind-rn

## Requirements

- Node version: ≥ 20
- JDK version: 17+
- SDK version: 34+

In case that you open the project in Android Studio:

- NDK version: 23.1.7779620
- CMake version: 3.22.1

## Setup

Follow these steps before running the project.

### 1. Installation

- Create a `.npmrc` file from the `.npmrc.template` example provided in the repo.
- Replace `TOKEN` with your own [Github Personal Access Token](https://docs.github.com/en/github/authenticating-to-github/keeping-your-account-and-data-secure/creating-a-personal-access-token) with `read:packages` permission **ONLY**
- Use `yarn` to install project dependencies.

### 2. Environment

In order to configure the environment, you have to create **/env/.env.development.json** and **/env/.env.production.json** files.

Take a look to **/env/.env.example.json** file to know the required environment variables.

</br>
<hr>
</br>

## Development

Remember to run the tailwind command during development to dynamically add and remove styles from src/styles/tailwind.json depending on the used classes:

```bash
yarn tailwind:dev
```

Other useful commands:

```bash
yarn check-ts        # TypeScript type check (run before committing)
yarn lint            # type check + ESLint
yarn lint:fix        # lint with auto-fix
yarn test:unit       # run Jest unit tests
yarn test:unit:watch # run Jest in watch mode
```

</br>
<hr>
</br>

## Android

We can run the android application in any operating system, although for each one we will have to follow some different steps

### Android installation

#### Ports mapping

In order **to connect a real device or an emulator to localhost** interface, we have to map used ports in our computer with the device ports.

First list the connected devices:

```bash
adb devices
```

Then use the following command to map **DEVICE_ID** device **PORT** to your localhost **PORT**:

```bash
adb -s DEVICE_ID reverse tcp:PORT tcp:PORT
```

#### ADB (Android Debug Bridge)

To install the ADB in Mac OS or Linux, execute the following command:

```bash
bash <(curl -s https://raw.githubusercontent.com/corbindavenport/nexus-tools/master/install.sh)
```

#### Dependencies

Opening the project with Android Studio will install the necessary dependencies to start the application.

</br>

### Run

Configure a virtual device in Android Studio or connect by USB a real device with ADB to run the Android application with the following command using the Expo CLI:

```bash
yarn android
```

</br>
<hr>
</br>

## iOS

You can only run the iOS application on a Mac OS computer.

### Run

```bash
yarn ios
```

</br>
<hr>
</br>

## Test

This is what you should know about project testing.

Take a look to this official article about [testing in React Native](https://reactnative.dev/docs/testing-overview).

### Unit tests

```bash
yarn test:unit
# or a single file:
jest path/to/file.spec.ts
```

### E2E tests (Detox)

```bash
yarn test:e2e:build:ios.debug
yarn test:e2e:test:ios.debug
yarn test:e2e:build:android.debug
yarn test:e2e:test:android.debug
```

- [Getting Started | Detox](https://wix.github.io/Detox/docs/introduction/getting-started/)
- [Jest Setup Guide | Detox](https://wix.github.io/Detox/docs/guide/jest)
