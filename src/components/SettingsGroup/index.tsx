import { GestureResponderEvent, StyleProp, TouchableHighlight, View, ViewStyle } from 'react-native';
import { useTailwind } from 'tailwind-rn';
import useGetColor from '../../hooks/useColor';
import AppText from '../AppText';

interface SettingsGroupItemProps {
  key: string;
  template: JSX.Element;
  style?: StyleProp<ViewStyle>;
  onPress?: (event: GestureResponderEvent) => void;
}

interface SettingsGroupProps {
  style?: StyleProp<ViewStyle>;
  title?: string;
  advice?: string;
  items: SettingsGroupItemProps[];
}

function SettingsGroup({ style, title, items, advice }: SettingsGroupProps) {
  const tailwind = useTailwind();
  const getColor = useGetColor();
  const SettingsGroupItem = (props: SettingsGroupItemProps) => {
    return (
      <TouchableHighlight
        disabled={!props.onPress}
        underlayColor={getColor('text-gray-10')}
        onPress={(event) => {
          props.onPress && props.onPress(event);
        }}
      >
        {props.template}
      </TouchableHighlight>
    );
  };
  const renderItems = () =>
    items.map((i, index) => {
      const isTheLast = index === items.length - 1;
      const separator = <View style={{ height: 1, ...tailwind('bg-gray-5 mx-4') }}></View>;

      return isTheLast ? (
        <SettingsGroupItem {...i} />
      ) : (
        <View key={i.key}>
          <SettingsGroupItem {...i} />
          {separator}
        </View>
      );
    });

  return (
    <View style={[tailwind('mb-8'), style]}>
      {title !== undefined && (
        <AppText style={tailwind('text-xs ml-4 mb-2')} semibold>
          {title.toUpperCase()}
        </AppText>
      )}
      <View style={tailwind('bg-white rounded-xl')}>{renderItems()}</View>
      {advice && <AppText style={tailwind('mt-2 ml-4 text-xs text-gray-40')}>{advice}</AppText>}
    </View>
  );
}

export default SettingsGroup;
