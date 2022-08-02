import React, { useState } from 'react';
import { View, Text, TouchableWithoutFeedback, StyleProp, ViewStyle } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import { useTailwind } from 'tailwind-rn';

interface AppCheckBoxProps {
  style?: StyleProp<ViewStyle>;
  testID?: string;
  text: string;
  onChange?: (value: boolean) => void;
  value?: boolean;
}

const AppCheckBox = (props: AppCheckBoxProps): JSX.Element => {
  const tailwind = useTailwind();
  const [checked, setChecked] = useState(props.value || false);

  const handleOnPress = () => {
    setChecked(!checked);
    if (props.onChange) {
      props.onChange(!checked);
    }
  };

  return (
    <TouchableWithoutFeedback testID={props.testID} onPress={handleOnPress}>
      <View style={[tailwind('flex-row p-0'), props.style]}>
        <View style={tailwind('my-1 mr-2')}>
          <Svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            style={checked ? tailwind('flex') : tailwind('hidden')}
          >
            <Rect x="0.5" y="0.5" width="15" height="15" rx="1.5" fill="#0F62FE" stroke="#0F62FE" />
            <Svg width="13" height="13" viewBox="-2 -1 12 8" fill="none">
              <Path
                // eslint-disable-next-line max-len
                d="M9.90882 0.869196C9.844 0.805008 9.76688 0.754061 9.6819 0.719294C9.59693 0.684526 9.50578 0.666626 9.41373 0.666626C9.32168 0.666626 9.23053 0.684526 9.14556 0.719294C9.06058 0.754061 8.98346 0.805008 8.91863 0.869196L3.72362 5.97799L1.54101 3.82764C1.47371 3.76379 1.39425 3.71358 1.30719 3.67988C1.22013 3.64619 1.12716 3.62966 1.03359 3.63125C0.940024 3.63284 0.847693 3.65251 0.761868 3.68915C0.676043 3.72578 0.598406 3.77866 0.533389 3.84476C0.468372 3.91086 0.417249 3.98889 0.382938 4.07439C0.348627 4.1599 0.331801 4.2512 0.33342 4.34309C0.335038 4.43498 0.355071 4.52566 0.392373 4.60994C0.429675 4.69423 0.483516 4.77048 0.550822 4.83433L3.22852 7.46406C3.29335 7.52824 3.37047 7.57919 3.45545 7.61396C3.54042 7.64873 3.63156 7.66663 3.72362 7.66663C3.81567 7.66663 3.90682 7.64873 3.99179 7.61396C4.07676 7.57919 4.15389 7.52824 4.21871 7.46406L9.90882 1.87589C9.97961 1.81176 10.0361 1.73393 10.0747 1.6473C10.1134 1.56067 10.1333 1.46712 10.1333 1.37254C10.1333 1.27797 10.1134 1.18442 10.0747 1.09779C10.0361 1.01116 9.97961 0.933324 9.90882 0.869196Z"
                fill="white"
              />
            </Svg>
          </Svg>

          <Svg width="16" height="16" viewBox="0 0 16 16" style={checked ? tailwind('hidden') : tailwind('flex')}>
            <Rect
              x="0.75"
              y="0.75"
              width="14.5"
              height="14.5"
              rx="1.25"
              fill="white"
              stroke="#42526E"
              stroke-width="1.5"
            />
          </Svg>
        </View>
        <View style={tailwind('my-1')}>
          <Text style={tailwind('text-base text-xs')}>{props.text || ''}</Text>
        </View>
      </View>
    </TouchableWithoutFeedback>
  );
};

export default AppCheckBox;
