# Drive Mobile [![Build Status](https://travis-ci.com/internxt/drive-mobile.svg?branch=master)](https://travis-ci.com/internxt/drive-mobile)

## Installation

- Create a `.npmrc` file from the `.npmrc.template` example provided in the repo.
- Replace `TOKEN` with your own [Github Personal Access Token](https://docs.github.com/en/github/authenticating-to-github/keeping-your-account-and-data-secure/creating-a-personal-access-token) with `read:packages` permission **ONLY**
- Use `yarn` to install project dependencies.

## Android

We can test the android application in any operating system, although for each one we will have to follow some different steps
</br></br>

### Android installation

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

</br></br>

### Run

Configure a virtual device in Android Studio or connect by USB a real device with ADB to run the Android application with the following command:

```bash
yarn android
```

</br></br>

### Test Deep Link on Android

```bash
adb shell am start -a android.intent.action.VIEW -d "inxt:https://drive.internxt.com"
```

</br>
<hr>
</br>

## iOS

You can only test the iOS application on a Mac OS computer.
</br></br>

### iOS installation

```bash
cd ios

pod deintegrate

sudo xcode-select -s /Applications/Xcode.app/Contents/Developer

pod install
```

If your computer is using <b>M1 Apple chipset</b>, replace the `pod install` command with the following:

```bash
sudo arch -x86_64 gem install ffi

arch -x86_64 pod install
```

</br></br>

### Run

```bash
yarn ios
```

Or specify a simulator:

```bash
yarn ios --simulator "iPhone X"
```

Or specify a connected device:

```bash
yarn ios --device "My iPhone"
```
