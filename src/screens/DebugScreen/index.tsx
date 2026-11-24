import { ScrollView } from 'react-native';
import { DebugDeviceStorageWidget } from 'src/components/DebugDeviceStorageWidget';
import strings from '../../../assets/lang/strings';
import AppScreen from '../../components/AppScreen';
import ScreenTitle from '../../components/AppScreenTitle';
import DebugDownloadWidget from '../../components/DebugDownloadWidget';
import DebugInternetWidget from '../../components/DebugInternetWidget';
import DebugNotificationsWidget from '../../components/DebugNotificationsWidget';
import DebugUploadWidget from '../../components/DebugUploadWidget';
import { RootStackScreenProps } from '../../types/navigation';

function DebugScreen({ navigation }: RootStackScreenProps<'Debug'>): JSX.Element {
  const onBackButtonPressed = () => navigation.goBack();

  return (
    <AppScreen safeAreaTop className="h-full">
      <ScreenTitle
        textClassName="text-2xl"
        text={strings.screens.DebugScreen.title}
        centerText
        onBackButtonPressed={onBackButtonPressed}
      />

      <ScrollView className="flex-1">
        <DebugInternetWidget />
        <DebugUploadWidget className="mb-5" />
        <DebugDownloadWidget className="mb-5" />
        <DebugNotificationsWidget className="mb-5" />
        <DebugDeviceStorageWidget className="mb-16" />
      </ScrollView>
    </AppScreen>
  );
}

export default DebugScreen;
