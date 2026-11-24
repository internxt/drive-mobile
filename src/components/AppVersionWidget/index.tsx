import { StyleProp, View, ViewStyle } from 'react-native';
import InternxtLogo from '../../../assets/logo.svg';
import InternxtLogoWhite from '../../../assets/logo_white.svg';
import { useTheme } from '../../contexts/Theme/Theme.context';
import appService from '../../services/AppService';
import AppText from '../AppText';
import { cssInterop } from 'nativewind';

interface AppVersionWidgetProps {
  style?: StyleProp<ViewStyle>;
  className?: string;
  displayLogo?: boolean;
}

function AppVersionWidget(props: AppVersionWidgetProps): JSX.Element {
  const { theme } = useTheme();

  const LogoComponent = theme === 'dark' ? InternxtLogoWhite : InternxtLogo;

  return (
    <View style={props.style}>
      {props.displayLogo ? (
        <View className="flex items-center justify-center mb-0.5 mt-5">
          <LogoComponent height={10} />
        </View>
      ) : null}
      <AppText className="text-center text-xs text-gray-50">
        v{appService.version} ({appService.constants.APP_BUILD_NUMBER})
      </AppText>
    </View>
  );
}

cssInterop(AppVersionWidget, { className: 'style' });

export default AppVersionWidget;
