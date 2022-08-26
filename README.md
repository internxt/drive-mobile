[![Build Status](https://travis-ci.com/internxt/drive-mobile.svg?branch=master)](https://travis-ci.com/internxt/drive-mobile)
![GitHub](https://img.shields.io/github/license/internxt/drive-mobile)

# Internxt Drive Mobile

<p align="center">
  <img src="./assets/icon.png?raw=true" style="width: 200px; max-width: 200px" />
</p>
<p align="center" style="margin-top: 10px;">Internxt</p>

## Setup

Follow these steps before running the project.

### 1. Installation

- Create a `.npmrc` file from the `.npmrc.template` example provided in the repo.
- Replace `TOKEN` with your own [Github Personal Access Token](https://docs.github.com/en/github/authenticating-to-github/keeping-your-account-and-data-secure/creating-a-personal-access-token) with `read:packages` permission **ONLY**
- Use `yarn` to install project dependencies.

### 2. Firebase (Optional)

Copy **/GoogleService-Info.plist** and **/google-services.json** from your Firebase application.

This is required to eject the app from expo properly using the **expo eject** command of expo-cli.

### 3. Environment

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
</br></br>

If you are using <b>Mac OS</b> an receiving the following error when during gradle sync

<p style="color: red; background: lightyellow; padding: 10px 15px;">
<span style="margin-right: 5px; font-size: 12px;">❌</span>
Caused by: groovy.lang.MissingPropertyException: No such property: logger for class: org.gradle.initialization.DefaultProjectDescriptor
</p>
Try opening Android Studio with the command below to ensure Android Studio is able to find Node

```bash
open -a /Applications/Android\ Studio.app
```

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

### iOS installation

```bash
cd ios

pod install
```

If your computer is using <b>M1 Apple chipset</b>, replace the `pod install` command with the following:

```bash
sudo arch -x86_64 gem install ffi

arch -x86_64 pod install
```

### Run

```bash
yarn ios
```

</br>
<hr>
</br>

## Known issues

Current react-native-reanimated fails with Android using RN 0.64, until we upgrade RN version, a patch needs to be added manually:
https://github.com/software-mansion/react-native-reanimated/issues/3161#issuecomment-1112285417

## Test

This is what you should know about project testing.

Take a look to this official article about [testing in React Native](https://reactnative.dev/docs/testing-overview).

### E2E

- [Getting Started | Detox](https://wix.github.io/Detox/docs/introduction/getting-started/)
- [Jest Setup Guide | Detox](https://wix.github.io/Detox/docs/guide/jest)
