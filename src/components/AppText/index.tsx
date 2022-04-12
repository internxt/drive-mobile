import { Text, TextProps } from 'react-native';
import { tailwind } from '../../helpers/designSystem';
import styles from '../../styles';

interface AppTextProps extends TextProps {
  semibold?: boolean;
  bold?: boolean;
}

const AppText = (props: AppTextProps): JSX.Element => {
  return (
    <Text
      {...props}
      style={[
        tailwind('text-neutral-900 text-base'),
        props.semibold && styles.fontWeight.semibold,
        props.bold && styles.fontWeight.bold,
        props.style,
      ]}
    >
      {props.children}
    </Text>
  );
};

export default AppText;
