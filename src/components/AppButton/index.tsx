import { StyleProp, TouchableHighlight, View, ViewStyle, useColorScheme } from 'react-native';
import { useTailwind } from 'tailwind-rn';
import useGetColor from '../../hooks/useColor';
import AppText from '../AppText';
import LoadingSpinner from '../LoadingSpinner';

interface AppButtonProps {
  testID?: string;
  title: string | JSX.Element;
  type: 'accept' | 'accept-2' | 'cancel' | 'cancel-2' | 'delete' | 'white' | 'secondary';
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}

const AppButton = (props: AppButtonProps): JSX.Element => {
  const tailwind = useTailwind();
  const getColor = useGetColor();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const isTitleString = typeof props.title === 'string';

  const getButtonStyles = () => {
    switch (props.type) {
      case 'accept':
        return {
          backgroundColor: props.disabled
            ? props.loading
              ? getColor('text-primary-dark')
              : getColor('bg-gray-30')
            : getColor('text-primary'),
          textColor: getColor('text-white'),
          underlayColor: getColor('text-primary-dark'),
        };

      case 'accept-2':
        return {
          backgroundColor: props.disabled ? getColor('bg-gray-10') : getColor('bg-primary-10'),
          textColor: props.disabled ? getColor('text-gray-40') : getColor('text-primary'),
          underlayColor: getColor('bg-primary-20'),
        };

      case 'cancel':
        return {
          backgroundColor: getColor('bg-gray-5'),
          textColor: props.disabled ? getColor('text-gray-40') : getColor('text-gray-80'),
          underlayColor: getColor('bg-gray-10'),
        };

      case 'cancel-2':
        return {
          backgroundColor: getColor('bg-primary-10'),
          textColor: getColor('text-primary'),
          underlayColor: getColor('bg-gray-10'),
        };

      case 'delete':
        return {
          backgroundColor: props.disabled ? getColor('bg-gray-30') : getColor('text-red'),
          textColor: getColor('text-white'),
          underlayColor: getColor('text-red-dark'),
        };

      case 'white':
        return {
          backgroundColor: getColor('bg-surface'),
          textColor: getColor('text-gray-80'),
          underlayColor: getColor('bg-gray-5'),
          borderColor: getColor('border-gray-20'),
          borderWidth: 1,
          shadowColor: isDark ? 'transparent' : '#000000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: isDark ? 0 : 0.16,
          shadowRadius: 1.51,
          elevation: isDark ? 0 : 2,
        };

      case 'secondary':
        return {
          backgroundColor: '#FFFFFF26',
          textColor: getColor('text-gray-80'),
          underlayColor: '#FFFFFF40',
          borderColor: isDark ? '#FFFFFF1A' : '#1111111A',
          borderWidth: 1,
        };

      default:
        return {
          backgroundColor: getColor('text-primary'),
          textColor: getColor('text-white'),
          underlayColor: getColor('text-primary-dark'),
        };
    }
  };

  const buttonStyles = getButtonStyles();

  const renderContent = () => {
    const title = isTitleString ? (
      <AppText medium numberOfLines={1} style={[tailwind('text-base'), { color: buttonStyles.textColor }]}>
        {props.title}
      </AppText>
    ) : (
      props.title
    );

    return (
      <View style={tailwind('flex-row items-center')}>
        {props.loading && (
          <View style={tailwind('mr-2 items-center justify-center')}>
            <LoadingSpinner color={buttonStyles.textColor} size={16} />
          </View>
        )}
        {title}
      </View>
    );
  };

  return (
    <TouchableHighlight
      testID={props.testID}
      underlayColor={buttonStyles.underlayColor}
      style={[
        tailwind('rounded-lg px-4 py-3 items-center justify-center'),
        {
          backgroundColor: buttonStyles.backgroundColor,
          borderColor: buttonStyles.borderColor,
          borderWidth: buttonStyles.borderWidth,
          shadowColor: buttonStyles.shadowColor,
          shadowOffset: buttonStyles.shadowOffset,
          shadowOpacity: buttonStyles.shadowOpacity,
          shadowRadius: buttonStyles.shadowRadius,
          elevation: buttonStyles.elevation,
        },
        props.style,
      ]}
      onPress={props.onPress}
      disabled={!!props.disabled || !!props.loading}
    >
      {renderContent()}
    </TouchableHighlight>
  );
};

export default AppButton;
