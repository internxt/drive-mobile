import '@types/react-native-modalbox';
import { EasingFunction } from 'react-native';

declare module 'react-native-modalbox' {
  export interface ModalProps {
    easing?: EasingFunction;
  }
}
