import { MagnifyingGlassIcon, XCircleIcon } from 'phosphor-react-native';
import { createRef, useState } from 'react';
import { ReturnKeyTypeOptions, StyleProp, TextInput, TouchableOpacity, View, ViewStyle } from 'react-native';
import { useTailwind } from 'tailwind-rn';
import strings from '../../../assets/lang/strings';
import useGetColor from '../../hooks/useColor';

import styles from '../../styles/global';
import AppText from '../AppText';
import { cssInterop } from 'nativewind';

interface SearchInputProps {
  value?: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  style?: StyleProp<ViewStyle>;
  className?: string;
  onFocusChange?: (isFocused: boolean) => void;
  onSubmitEditing?: () => void;
  autoFocus?: boolean;
  returnKeyType?: ReturnKeyTypeOptions;
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
    <View className="flex-row" style={props.style}>
      <View className={`flex-1 py-2 ${isFocused ? 'pl-3' : 'px-4'}`}>
        <View className="bg-gray-5 flex-grow rounded-xl flex-shrink" style={{ backgroundColor: getColor('bg-gray-5') }}>
          <View className="flex-row items-center">
            {!isFocused && (
              <View className="pl-3">
                <MagnifyingGlassIcon color={getColor('text-gray-40')} size={18} />
              </View>
            )}

            <TextInput
              ref={inputRef}
              onFocus={onFocus}
              onBlur={onBlur}
              onChangeText={props.onChangeText}
              onSubmitEditing={props.onSubmitEditing}
              autoFocus={props.autoFocus}
              returnKeyType={props.returnKeyType}
              value={props.value}
              style={[
                styles.fontWeight.regular,
                tailwind('pl-3 h-9 flex-1'),
                {
                  fontSize: 16,
                  color: getColor('text-gray-100'),
                  paddingVertical: 0,
                  textAlignVertical: 'center',
                  includeFontPadding: false,
                },
              ]}
              placeholder={props.placeholder || ''}
              placeholderTextColor={getColor('text-gray-80')}
            />

            {!!props.value && (
              <TouchableOpacity onPress={onClearButtonPressed}>
                <View className="py-1.5 px-3 items-center justify-center">
                  <XCircleIcon weight="fill" color={getColor('text-gray-40')} size={24} />
                </View>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      {isFocused && (
        <TouchableOpacity onPress={onCancelButtonPressed}>
          <View className="flex-grow px-3 justify-center">
            <AppText className="text-sm text-primary">{strings.buttons.cancel}</AppText>
          </View>
        </TouchableOpacity>
      )}
    </View>
  );
}

cssInterop(SearchInput, { className: 'style' });
