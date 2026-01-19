declare module '*.svg' {
  import React from 'react';
  import { SvgProps } from 'react-native-svg';
  const content: React.FC<SvgProps>;

  export default content;
}

declare module '@hookform/resolvers/yup' {
  import { FieldValues, Resolver } from 'react-hook-form';
  import { AnyObjectSchema, InferType } from 'yup';

  export function yupResolver<T extends AnyObjectSchema>(
    schema: T,
    schemaOptions?: object,
    resolverOptions?: { mode?: 'async' | 'sync'; raw?: boolean },
  ): Resolver<InferType<T>>;
}

declare module 'react-native-modalbox' {
  import { Component } from 'react';
  import { EasingFunction, StyleProp, ViewStyle } from 'react-native';

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
