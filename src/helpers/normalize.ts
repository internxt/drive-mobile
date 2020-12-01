import { Dimensions, PixelRatio, Platform } from "react-native";

export const normalize = (size: number) => {
  const {
      width: SCREEN_WIDTH,
      height: SCREEN_HEIGHT,
  } = Dimensions.get('window');
    
  // based on iphone 5s's scale
  const scale = SCREEN_WIDTH / 320;
  const newSize = size * scale ;

  return Platform.OS === 'ios' ? 
      Math.round(PixelRatio.roundToNearestPixel(newSize))
  :
      Math.round(PixelRatio.roundToNearestPixel(newSize)) - 2;
}
