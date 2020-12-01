import * as Font from 'expo-font';

async function loadFontsAsync() {
  return Font.loadAsync({
    'CerebriSans-Bold': require('../../assets/fonts/CerebriSans-Bold.ttf'),
    'CerebriSans-Medium': require('../../assets/fonts/CerebriSans-Medium.ttf'),
    'CerebriSans-Regular': require('../../assets/fonts/CerebriSans-Regular.ttf'),
    'CircularStd-Bold': require('../../assets/fonts/CircularStd-Bold.ttf'),
    'CircularStd-Black': require('../../assets/fonts/CircularStd-Black.ttf'),
    'CircularStd-Book': require('../../assets/fonts/CircularStd-Book.ttf'),
    'CircularStd-Medium': require('../../assets/fonts/CircularStd-Medium.ttf')
  });
}

export const loadFonts = loadFontsAsync
