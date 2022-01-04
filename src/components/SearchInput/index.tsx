import React from 'react';
import { View, TextInput, TouchableWithoutFeedback, StyleProp, ViewStyle } from 'react-native';
import * as Unicons from '@iconscout/react-native-unicons';
import { getColor, tailwind } from '../../helpers/designSystem';

interface SearchInputProps {
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  style?: StyleProp<ViewStyle>;
}

function SearchInput(props: SearchInputProps): JSX.Element {
  const showCloseIcon = !!props.value;

  return (
    <View style={[tailwind('flex-row px-5'), props.style]}>
      <View style={tailwind('bg-neutral-20 flex-grow rounded-xl flex-shrink')}>
        <View style={tailwind('flex-row items-center')}>
          <View style={tailwind('px-3')}>
            <Unicons.UilSearch color={getColor('neutral-60')} size={18} />
          </View>

          <TextInput
            onChangeText={props.onChangeText}
            value={props.value}
            style={tailwind('text-base flex-grow flex-shrink py-1.5')}
            placeholder={props.placeholder || ''}
            placeholderTextColor={getColor('neutral-60')}
          />

          {showCloseIcon && (
            <View style={tailwind('px-3')}>
              <TouchableWithoutFeedback onPress={() => props.onChangeText('')}>
                <Unicons.UilTimesCircle color={getColor('neutral-100')} size={18} />
              </TouchableWithoutFeedback>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

export default SearchInput;
