# Drive Mobile [![Build Status](https://travis-ci.com/internxt/drive-mobile.svg?branch=master)](https://travis-ci.com/internxt/drive-mobile)

`cd ios`

`pod deintegrate`

`sudo xcode-select --switch /Application/XCode.app`

`pod install`

Test Deep Link on Android

`adb shell am start -a android.intent.action.VIEW -d "inxt:https://drive.internxt.com"`