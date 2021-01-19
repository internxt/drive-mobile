import * as Font from 'expo-font';

/**
 * Load fonts from assets
 */
async function loadFontsAsync(): Promise<void> {
  return Font.loadAsync({
    'Averta-Bold': require('../../assets/fonts/Averta-Bold.otf'),
    'Averta-Regular': require('../../assets/fonts/Averta-Regular.otf'),
    'Averta-Extra-Bold': require('../../assets/fonts/Averta-Extra-Bold.otf'),
    'Averta-Light': require('../../assets/fonts/Averta-Light.otf'),
    'Averta-Black': require('../../assets/fonts/Averta-Black.otf'),
    'Averta-Semibold': require('../../assets/fonts/Averta-Semibold.otf')
  });
}

export const loadFonts = loadFontsAsync
