import { Text, TextProps, TextStyle } from 'react-native';
import { useTailwind } from 'tailwind-rn';
import useGetColor from '../../hooks/useColor';
import styles from '../../styles/global';

interface AppTextProps extends TextProps {
  medium?: boolean;
  semibold?: boolean;
  bold?: boolean;
  lineHeight?: number;
}

const AppText = (props: AppTextProps): JSX.Element => {
  const tailwind = useTailwind();
  const getColor = useGetColor();

  const getFontSize = (): number => {
    if ((props.style as TextStyle)?.fontSize) {
      return (props.style as TextStyle).fontSize as number;
    }
    return tailwind('text-base').fontSize as number;
  };

  const hasCustomColor =
    props.style &&
    (Array.isArray(props.style)
      ? props.style.some((style) => style && typeof style === 'object' && 'color' in style)
      : typeof props.style === 'object' && 'color' in props.style);

  return (
    <Text
      {...props}
      style={[
        tailwind('text-base'),
        { color: hasCustomColor ? undefined : getColor('text-gray-100') },
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
