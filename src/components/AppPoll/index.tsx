import { CheckCircle } from 'phosphor-react-native';
import { useState } from 'react';
import { TouchableWithoutFeedback, View } from 'react-native';
import { useTailwind } from 'tailwind-rn';
import useGetColor from '../../hooks/useColor';
import AppText from '../AppText';

interface AppPollProps {
  title: string;
  advice: string;
  options: { key: string; message: string }[];
  selectedOptionKey: string | undefined;
  onOptionSelected?: (option: { key: string; message: string }) => void;
}

const AppPoll = (props: AppPollProps) => {
  const tailwind = useTailwind();
  const getColor = useGetColor();
  const renderOptions = () =>
    props.options.map((option, index) => {
      const isTheFirst = index === 0;
      const isTheLast = index === props.options.length - 1;
      const isSelected = option.key === props.selectedOptionKey;

      return (
        <View key={option.key}>
          <TouchableWithoutFeedback onPress={() => props.onOptionSelected?.(option)}>
            <View
              style={[
                tailwind('flex-row pl-4 py-3.5'),
                isSelected && tailwind('bg-primary/10'),
                isTheFirst && tailwind('rounded-t-xl'),
                isTheLast && tailwind('rounded-b-xl'),
              ]}
            >
              <AppText numberOfLines={1} style={tailwind('flex-1')}>
                {option.message}
              </AppText>
              <View style={tailwind('items-center justify-center w-10')}>
                {isSelected && <CheckCircle weight="fill" size={20} color={getColor('text-primary')} />}
              </View>
            </View>
          </TouchableWithoutFeedback>
          {!isTheLast && <View style={{ ...tailwind('mx-4 bg-gray-10'), height: 1 }} />}
        </View>
      );
    });

  return (
    <View>
      <AppText style={tailwind('ml-4 mb-2')}>{props.title}</AppText>

      <View style={tailwind('rounded-xl bg-gray-5')}>{renderOptions()}</View>

      <AppText style={tailwind('ml-4 mt-2 text-xs text-gray-40')}>{props.advice}</AppText>
    </View>
  );
};

export default AppPoll;
