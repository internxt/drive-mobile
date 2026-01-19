import { Component } from 'react';
import { EasingFunction, StyleProp, ViewStyle } from 'react-native';

declare module 'react-native-modalbox' {
  export interface ModalProps {
    isOpen?: boolean;
    isDisabled?: boolean;
    startOpen?: boolean;
    backdropPressToClose?: boolean;
    swipeToClose?: boolean;
    swipeThreshold?: number;
    swipeArea?: number;
    position?: 'top' | 'center' | 'bottom';
    entry?: 'top' | 'bottom';
    backdrop?: boolean;
    backdropOpacity?: number;
    backdropColor?: string;
    backdropContent?: React.ReactNode;
    animationDuration?: number;
    backButtonClose?: boolean;
    easing?: EasingFunction;
    coverScreen?: boolean;
    keyboardTopOffset?: number;
    onClosed?: () => void;
    onOpened?: () => void;
    onClosingState?: (state: boolean) => void;
    style?: StyleProp<ViewStyle>;
    children?: React.ReactNode;
  }

  export default class Modal extends Component<ModalProps> {
    open(): void;
    close(): void;
  }
}
