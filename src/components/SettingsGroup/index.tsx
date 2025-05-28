import { GestureResponderEvent, StyleProp, TouchableHighlight, View, ViewProps, ViewStyle } from 'react-native';
import { useTailwind } from 'tailwind-rn';
import useGetColor from '../../hooks/useColor';
import AppText from '../AppText';

interface SettingsGroupItemProps {
  key: string;
  template: JSX.Element;
  style?: StyleProp<ViewStyle>;
  loading?: boolean;
  onPress?: (event: GestureResponderEvent) => void;
}

interface SettingsGroupProps extends ViewProps {
  style?: StyleProp<ViewStyle>;
  title?: string;
  advice?: string;
  items: SettingsGroupItemProps[];
}

function SettingsGroup({ style, title, items, advice, ...rest }: SettingsGroupProps) {
  const tailwind = useTailwind();
  const getColor = useGetColor();

  const SettingsGroupItem = (props: SettingsGroupItemProps) => {
    return (
      <TouchableHighlight
        disabled={!props.onPress || props.loading}
        underlayColor={getColor('bg-gray-5')}
        onPress={(event) => {
          props.onPress && props.onPress(event);
        }}
        style={{ backgroundColor: getColor('bg-surface') }}
      >
        {props.template}
      </TouchableHighlight>
    );
  };

  const renderItems = () =>
    items.map((i, index) => {
      const isTheLast = index === items.length - 1;
      const separator = (
        <View
          style={{
            height: 1,
            backgroundColor: getColor('bg-gray-5'),
            marginHorizontal: 16,
          }}
        />
      );

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
    <View style={[tailwind('mb-8'), style]} {...rest}>
      {title !== undefined && (
        <AppText style={[tailwind('text-xs ml-4 mb-2'), { color: getColor('text-gray-60') }]} semibold>
          {title.toUpperCase()}
        </AppText>
      )}
      <View style={[tailwind('rounded-xl overflow-hidden'), { backgroundColor: getColor('bg-surface') }]}>
        {renderItems()}
      </View>
      {advice && (
        <AppText style={[tailwind('mt-2 mx-4 text-xs'), { color: getColor('text-gray-40') }]}>{advice}</AppText>
      )}
    </View>
  );
}

export default SettingsGroup;
