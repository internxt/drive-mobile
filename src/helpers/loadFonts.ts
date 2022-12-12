import * as Font from 'expo-font';

export function useLoadFonts() {
  const [isReady, error] = Font.useFonts({
    'NeueEinstellung-Black': require('../../assets/fonts/NeueEinstellung-Black.otf'),
    'NeueEinstellung-Bold': require('../../assets/fonts/NeueEinstellung-Black.otf'),
    'NeueEinstellung-ExtraBold': require('../../assets/fonts/NeueEinstellung-ExtraBold.otf'),
    'NeueEinstellung-ExtraLight': require('../../assets/fonts/NeueEinstellung-ExtraLight.otf'),
    'NeueEinstellung-Light': require('../../assets/fonts/NeueEinstellung-Light.otf'),
    'NeueEinstellung-Medium': require('../../assets/fonts/NeueEinstellung-Medium.otf'),
    'NeueEinstellung-Regular': require('../../assets/fonts/NeueEinstellung-Regular.otf'),
    'NeueEinstellung-SemiBold': require('../../assets/fonts/NeueEinstellung-SemiBold.otf'),
    'NeueEinstellung-Thin': require('../../assets/fonts/NeueEinstellung-Thin.otf'),
  });

  return {
    isReady,
    error,
  };
}
