import { GestureResponderEvent, StyleProp, TouchableHighlight, View, ViewProps, ViewStyle } from 'react-native';
import useGetColor from '../../hooks/useColor';
import AppText from '../AppText';
import { cssInterop } from 'nativewind';

interface SettingsGroupItemProps {
  template: JSX.Element;
  style?: StyleProp<ViewStyle>;
  loading?: boolean;
  onPress?: (event: GestureResponderEvent) => void;
}

interface SettingsGroupItemWithKey extends SettingsGroupItemProps {
  key: string;
}

interface SettingsGroupProps extends ViewProps {
  style?: StyleProp<ViewStyle>;
  title?: string;
  advice?: string;
  items: SettingsGroupItemWithKey[];
}

const SettingsGroupItem = (props: SettingsGroupItemProps) => {
  const getColor = useGetColor();
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

function SettingsGroup({ style, title, items, advice, ...rest }: SettingsGroupProps) {
  const getColor = useGetColor();

  const renderItems = () =>
    items.map((i, index) => {
      const isTheLast = index === items.length - 1;
      const { key, ...itemProps } = i;
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
        <SettingsGroupItem key={key} {...itemProps} />
      ) : (
        <View key={key}>
          <SettingsGroupItem {...itemProps} />
          {separator}
        </View>
      );
    });

  return (
    <View className="mb-8" style={style} {...rest}>
      {title !== undefined && (
        <AppText className="text-xs ml-4 mb-2" style={{ color: getColor('text-gray-60') }} semibold>
          {title.toUpperCase()}
        </AppText>
      )}
      <View className="rounded-xl overflow-hidden" style={{ backgroundColor: getColor('bg-surface') }}>
        {renderItems()}
      </View>
      {advice && (
        <AppText className="mt-2 mx-4 text-xs" style={{ color: getColor('text-gray-40') }}>
          {advice}
        </AppText>
      )}
    </View>
  );
}

cssInterop(SettingsGroup, { className: 'style' });

export default SettingsGroup;
