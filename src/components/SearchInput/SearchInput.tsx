import { MagnifyingGlass, XCircle } from 'phosphor-react-native';
import React, { createRef, useState } from 'react';
import { View, TextInput, StyleProp, ViewStyle, TouchableOpacity } from 'react-native';
import { useTailwind } from 'tailwind-rn';
import strings from '../../../assets/lang/strings';
import useGetColor from '../../hooks/useColor';

import styles from '../../styles/global';
import AppText from '../AppText';

interface SearchInputProps {
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  style?: StyleProp<ViewStyle>;
}

export function SearchInput(props: SearchInputProps): JSX.Element {
  const tailwind = useTailwind();
  const getColor = useGetColor();
  const [inputRef] = useState(createRef<TextInput>());
  const [isFocused, setIsFocused] = useState(false);
  const onBlur = () => {
    setIsFocused(false);
  };
  const onFocus = () => {
    setIsFocused(true);
  };
  const onClearButtonPressed = () => {
    inputRef.current?.clear();
    props.onChangeText('');
  };
  const onCancelButtonPressed = () => {
    inputRef.current?.blur();
  };

  return (
    <View style={[tailwind('flex-row'), props.style]}>
      <View style={[tailwind('flex-1 py-2'), isFocused ? tailwind('pl-3') : tailwind('px-5')]}>
        <View style={tailwind('bg-neutral-20 flex-grow rounded-xl flex-shrink')}>
          <View style={tailwind('flex-row items-center')}>
            {!isFocused && (
              <View style={tailwind('pl-3')}>
                <MagnifyingGlass color={getColor('text-neutral-60')} size={18} />
              </View>
            )}

            <TextInput
              ref={inputRef}
              onFocus={onFocus}
              onBlur={onBlur}
              onChangeText={props.onChangeText}
              value={props.value}
              style={[styles.fontWeight.regular, tailwind('text-base pl-3 h-9 flex-1'), { marginBottom: 2 }]}
              placeholder={props.placeholder || ''}
              placeholderTextColor={getColor('text-neutral-60')}
            />

            {!!props.value && (
              <TouchableOpacity onPress={onClearButtonPressed}>
                <View style={tailwind('py-1.5 px-3 items-center justify-center')}>
                  <XCircle weight="fill" color={getColor('text-neutral-60')} size={24} />
                </View>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      {isFocused && (
        <TouchableOpacity onPress={onCancelButtonPressed}>
          <View style={tailwind('flex-grow px-3 justify-center')}>
            <AppText style={tailwind('text-sm text-blue-60')}>{strings.buttons.cancel}</AppText>
          </View>
        </TouchableOpacity>
      )}
    </View>
  );
}
