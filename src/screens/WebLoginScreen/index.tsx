import { CheckCircle, WarningCircle } from 'phosphor-react-native';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useTailwind } from 'tailwind-rn';
import strings from '../../../assets/lang/strings';
import AppScreen from '../../components/AppScreen';
import AppText from '../../components/AppText';
import useGetColor from '../../hooks/useColor';
import authService from '../../services/AuthService';
import { logger } from '../../services/common';
import errorService from '../../services/ErrorService';
import { useAppDispatch } from '../../store/hooks';
import { authThunks } from '../../store/slices/auth';
import { RootStackScreenProps } from '../../types/navigation';

type LoadingState = 'processing' | 'success' | 'error';

function WebLoginScreen({ route, navigation }: RootStackScreenProps<'WebLogin'>): JSX.Element {
  const tailwind = useTailwind();
  const getColor = useGetColor();
  const dispatch = useAppDispatch();
  const [loadingState, setLoadingState] = useState<LoadingState>('processing');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleDeepLink = async () => {
      const params = route.params;

      if (!params) {
        navigation.replace('SignIn');
        return;
      }

      const { mnemonic, token, newToken, privateKey } = params;

      if (!mnemonic || !token || !newToken) {
        setLoadingState('error');
        setError(strings.screens.WebLoginScreen.missingParameters);
        logger.error('WebLoginScreen: Missing required parameters', !mnemonic || !token || !newToken);
        setTimeout(() => navigation.replace('SignIn'), 2000);
        return;
      }

      try {
        const result = await authService.handleWebLogin({
          mnemonic,
          token,
          newToken,
          privateKey,
        });

        await dispatch(
          authThunks.signInThunk({
            user: result.user,
            token: result.token,
            newToken: result.newToken,
          }),
        ).unwrap();

        setLoadingState('success');
        setTimeout(() => navigation.replace('TabExplorer', { screen: 'Home' }), 800);
      } catch (error) {
        const castedError = errorService.castError(error);
        setLoadingState('error');
        setError(castedError.message);
        logger.error('WebLoginScreen error', error);

        setTimeout(() => navigation.replace('SignIn'), 2000);
      }
    };

    handleDeepLink();
  }, [route.params, dispatch, navigation]);

  const renderContent = () => {
    switch (loadingState) {
      case 'processing':
        return (
          <View style={tailwind('items-center')}>
            <AppText medium style={[tailwind('text-xl'), { color: getColor('text-gray-100') }]}>
              {strings.screens.WebLoginScreen.processing}
            </AppText>
          </View>
        );

      case 'success':
        return (
          <View style={tailwind('items-center')}>
            <View style={tailwind('mb-4')}>
              <CheckCircle size={64} color={getColor('text-green')} weight="fill" />
            </View>
            <AppText medium style={[tailwind('text-xl'), { color: getColor('text-gray-100') }]}>
              {strings.screens.WebLoginScreen.success}
            </AppText>
          </View>
        );

      case 'error':
        return (
          <View style={tailwind('items-center')}>
            <View style={tailwind('mb-4')}>
              <WarningCircle size={64} color={getColor('text-red')} weight="fill" />
            </View>
            <AppText medium style={[tailwind('text-xl text-center px-6'), { color: getColor('text-red') }]}>
              {error || strings.screens.WebLoginScreen.authenticationFailed}
            </AppText>
          </View>
        );
    }
  };

  return (
    <AppScreen
      safeAreaTop
      safeAreaBottom
      style={[tailwind('h-full justify-center items-center'), { backgroundColor: getColor('bg-surface') }]}
    >
      {renderContent()}
    </AppScreen>
  );
}

export default WebLoginScreen;
