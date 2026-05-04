import { ScrollView } from 'react-native';
import { DebugDeviceStorageWidget } from 'src/components/DebugDeviceStorageWidget';
import { useTailwind } from 'tailwind-rn';
import strings from '../../../assets/lang/strings';
import AppScreen from '../../components/AppScreen';
import ScreenTitle from '../../components/AppScreenTitle';
import DebugDownloadWidget from '../../components/DebugDownloadWidget';
import DebugInternetWidget from '../../components/DebugInternetWidget';
import DebugNotificationsWidget from '../../components/DebugNotificationsWidget';
import DebugUploadWidget from '../../components/DebugUploadWidget';
import { RootStackScreenProps } from '../../types/navigation';

function DebugScreen({ navigation }: RootStackScreenProps<'Debug'>): JSX.Element {
  const tailwind = useTailwind();
  const onBackButtonPressed = () => navigation.goBack();

  return (
    <AppScreen safeAreaTop style={tailwind('h-full')}>
      <ScreenTitle
        textStyle={tailwind('text-2xl')}
        text={strings.screens.DebugScreen.title}
        centerText
        onBackButtonPressed={onBackButtonPressed}
      />

      <ScrollView style={tailwind('flex-1')}>
        <DebugInternetWidget />
        <DebugUploadWidget style={tailwind('mb-5')} />
        <DebugDownloadWidget style={tailwind('mb-5')} />
        <DebugNotificationsWidget style={tailwind('mb-5')} />
        <DebugDeviceStorageWidget style={tailwind('mb-16')} />
      </ScrollView>
    </AppScreen>
  );
}

export default DebugScreen;
