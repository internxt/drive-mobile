import * as Font from 'expo-font';

export function useLoadFonts() {
  const [isReady, error] = Font.useFonts({
    'InstrumentSans-Regular': require('../../assets/fonts/InstrumentSans/InstrumentSans-Regular.otf'),
    'InstrumentSans-Medium': require('../../assets/fonts/InstrumentSans/InstrumentSans-Medium.otf'),
    'InstrumentSans-SemiBold': require('../../assets/fonts/InstrumentSans/InstrumentSans-SemiBold.otf'),
    'InstrumentSans-Bold': require('../../assets/fonts/InstrumentSans/InstrumentSans-Bold.otf'),
  });

  return {
    isReady,
    error,
  };
}
