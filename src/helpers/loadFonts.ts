import * as Font from 'expo-font';

/**
 * Load fonts from assets
 */
async function loadFontsAsync(): Promise<void> {
  return Font.loadAsync({
    'NeueEinstellung-Black': require('../../assets/fonts/NeueEinstellung-Black.otf'),
    'NeueEinstellung-Bold': require('../../assets/fonts/NeueEinstellung-Black.otf'),
    'NeueEinstellung-ExtraBold': require('../../assets/fonts/NeueEinstellung-ExtraBold.otf'),
    'NeueEinstellung-ExtraLight': require('../../assets/fonts/NeueEinstellung-ExtraLight.otf'),
    'NeueEinstellung-Light': require('../../assets/fonts/NeueEinstellung-Light.otf'),
    'NeueEinstellung-Medium': require('../../assets/fonts/NeueEinstellung-Medium.otf'),
    'NeueEinstellung-Regular': require('../../assets/fonts/NeueEinstellung-Regular.otf'),
    'NeueEinstellung-SemiBold': require('../../assets/fonts/NeueEinstellung-SemiBold.otf'),
    'NeueEinstellung-Thin': require('../../assets/fonts/NeueEinstellung-Thin.otf')
  });
}

export const loadFonts = loadFontsAsync
