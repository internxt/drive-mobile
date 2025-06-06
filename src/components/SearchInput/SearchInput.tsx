import { MagnifyingGlass, XCircle } from 'phosphor-react-native';
import { createRef, useState } from 'react';
import { StyleProp, TextInput, TouchableOpacity, View, ViewStyle } from 'react-native';
import { useTailwind } from 'tailwind-rn';
import strings from '../../../assets/lang/strings';
import useGetColor from '../../hooks/useColor';

import styles from '../../styles/global';
import AppText from '../AppText';

interface SearchInputProps {
  value?: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  style?: StyleProp<ViewStyle>;
  onFocusChange?: (isFocused: boolean) => void;
}

export function SearchInput(props: SearchInputProps): JSX.Element {
  const tailwind = useTailwind();
  const getColor = useGetColor();
  const [inputRef] = useState(createRef<TextInput>());
  const [isFocused, setIsFocused] = useState(false);

  const onBlur = () => {
    setIsFocused(false);
    props.onFocusChange?.(false);
  };

  const onFocus = () => {
    setIsFocused(true);
    props.onFocusChange?.(true);
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
      <View style={[tailwind('flex-1 py-2'), isFocused ? tailwind('pl-3') : tailwind('px-4')]}>
        <View style={tailwind('bg-gray-5 flex-grow rounded-xl flex-shrink')}>
          <View style={tailwind('flex-row items-center')}>
            {!isFocused && (
              <View style={tailwind('pl-3')}>
                <MagnifyingGlass color={getColor('text-gray-40')} size={18} />
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
              placeholderTextColor={getColor('text-gray-40')}
            />

            {!!props.value && (
              <TouchableOpacity onPress={onClearButtonPressed}>
                <View style={tailwind('py-1.5 px-3 items-center justify-center')}>
                  <XCircle weight="fill" color={getColor('text-gray-40')} size={24} />
                </View>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      {isFocused && (
        <TouchableOpacity onPress={onCancelButtonPressed}>
          <View style={tailwind('flex-grow px-3 justify-center')}>
            <AppText style={tailwind('text-sm text-primary')}>{strings.buttons.cancel}</AppText>
          </View>
        </TouchableOpacity>
      )}
    </View>
  );
}
