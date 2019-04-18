# X Cloud Mobile

This project was bootstrapped with [Create React Native App](https://github.com/react-community/create-react-native-app).

## Getting Started
- [Expo CLI](https://docs.expo.io/versions/latest/workflow/expo-cli) is required for local development

```bash
$ npm install expo-cli --global
```

Clone repo and install dependencies
```bash
$ git clone https://github.com/Internxt/X-Cloud-Mobile

$ cd X-Cloud-Mobile

$ npm install
```

Run the app
```bash
$ npm start
```

## Expo Client for Android & iOS
Run your projects before you deploy. Open projects by scanning QR codes. 

- [iOS App](https://itunes.apple.com/app/apple-store/id982107779)
- [Android App](https://play.google.com/store/apps/details?id=host.exp.exponent&referrer=www)

## Debug
### Android simulator
> Step 1. Install [Android studio](https://developer.android.com/studio/) and setup virtual device: [Create and manage virtual devices](https://developer.android.com/studio/run/managing-avds).

> Step 2. Follow [these steps](https://docs.expo.io/versions/v30.0.0/workflow/android-studio-emulator).

> Step 3. Start React Native Debugger

```bash
$ npm start
$ npm run debug

# Start Android Studio -> AVD Manager (ctrl+shift+a) -> Start simulator

# Wake up simulator http://facebook.github.io/react-native/docs/debugging
$ adb shell input keyevent 82 # or just ⌘M -> "Start remote JS Debugging"
```
