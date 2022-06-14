import { useState } from 'react';
import { View } from 'react-native';
import AppText from '../AppText';

interface AppPollProps {
  title: string;
  advice: string;
  options: string[];
}

const AppPoll = (props: AppPollProps) => {
  const [selectedOption, setSelectedOption] = useState<number>();
  const renderOptions = () =>
    props.options.map((option) => (
      <View key={option}>
        <AppText>{option}</AppText>
      </View>
    ));

  return (
    <View>
      <AppText>{props.title}</AppText>

      <View>{renderOptions()}</View>

      <AppText>{props.advice}</AppText>
    </View>
  );
};

export default AppPoll;
