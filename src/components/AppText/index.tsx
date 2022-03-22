import { Text, TextProps } from 'react-native';
import { tailwind } from '../../helpers/designSystem';

const AppText = (props: TextProps): JSX.Element => {
  return (
    <Text {...props} style={[tailwind('text-neutral-900 text-base'), props.style]}>
      {props.children}
    </Text>
  );
};

export default AppText;
