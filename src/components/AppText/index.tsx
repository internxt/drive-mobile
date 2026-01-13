import { Text, TextProps, TextStyle } from 'react-native';
import { useTailwind } from 'tailwind-rn';
import styles from '../../styles/global';

interface AppTextProps extends TextProps {
  medium?: boolean;
  semibold?: boolean;
  bold?: boolean;
  lineHeight?: number;
}

const AppText = (props: AppTextProps): JSX.Element => {
  const tailwind = useTailwind();

  const getFontSize = (): number => {
    if ((props.style as TextStyle)?.fontSize) {
      return (props.style as TextStyle).fontSize as number;
    }
    return tailwind('text-base').fontSize as number;
  };
  return (
    <Text
      {...props}
      style={[
        tailwind('text-gray-80 text-base'),
        styles.fontWeight.regular,
        props.style,
        props.medium && styles.fontWeight.medium,
        props.semibold && styles.fontWeight.semibold,
        props.bold && styles.fontWeight.bold,
        props.lineHeight
          ? {
              lineHeight: getFontSize() * props.lineHeight,
            }
          : {},
      ]}
    >
      {props.children}
    </Text>
  );
};

export default AppText;
