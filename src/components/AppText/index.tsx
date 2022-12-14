import { Text, TextProps } from 'react-native';
import { useTailwind } from 'tailwind-rn';
import styles from '../../styles/global';

interface AppTextProps extends TextProps {
  medium?: boolean;
  semibold?: boolean;
  bold?: boolean;
}

const AppText = (props: AppTextProps): JSX.Element => {
  const tailwind = useTailwind();

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
      ]}
    >
      {props.children}
    </Text>
  );
};

export default AppText;
