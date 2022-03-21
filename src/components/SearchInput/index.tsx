import React, { createRef, useState } from 'react';
import { View, TextInput, StyleProp, ViewStyle, TouchableOpacity } from 'react-native';
import * as Unicons from '@iconscout/react-native-unicons';
import { getColor, tailwind } from '../../helpers/designSystem';

interface SearchInputProps {
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  style?: StyleProp<ViewStyle>;
}

function SearchInput(props: SearchInputProps): JSX.Element {
  const [inputRef] = useState(createRef<TextInput>());
  const [showSearchIcon, setShowSearchIcon] = useState(true);
  const onBlur = () => {
    setShowSearchIcon(true);
  };
  const onFocus = () => {
    setShowSearchIcon(false);
  };
  const onClearButtonPressed = () => {
    inputRef.current?.clear();
    props.onChangeText('');
  };

  return (
    <View style={[tailwind('flex-row px-5'), props.style]}>
      <View style={tailwind('bg-neutral-20 flex-grow rounded-xl flex-shrink')}>
        <View style={tailwind('flex-row items-center')}>
          {showSearchIcon && (
            <View style={tailwind('pl-3')}>
              <Unicons.UilSearch color={getColor('neutral-60')} size={18} />
            </View>
          )}

          <TextInput
            ref={inputRef}
            onFocus={onFocus}
            onBlur={onBlur}
            onChangeText={props.onChangeText}
            value={props.value}
            style={tailwind('text-base flex-grow flex-shrink pl-3 py-1.5')}
            placeholder={props.placeholder || ''}
            placeholderTextColor={getColor('neutral-60')}
          />

          {!!props.value && (
            <TouchableOpacity onPress={onClearButtonPressed}>
              <View style={tailwind('py-1.5 px-3 items-center justify-center')}>
                <Unicons.UilTimesCircle color={getColor('neutral-100')} size={24} />
              </View>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

export default SearchInput;
