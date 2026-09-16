import { View } from 'react-native';
import { useTailwind } from 'tailwind-rn';

import AppButton from '../../../../components/AppButton';
import AppText from '../../../../components/AppText';
import LoadingSpinner from '../../../../components/LoadingSpinner';
import CenterModal from '../../../../components/modals/CenterModal';
import useGetColor from '../../../../hooks/useColor';

export type BlockingLoaderAction = {
  label: string;
  type: 'secondary' | 'delete';
  onPress: () => void;
};

/**
 * A message over the screen, with a spinner while something is happening and the buttons the user can
 * answer with. It cannot be dismissed and lets nothing be touched through it while it is open.
 *
 * @param props.isOpen - Whether the loader is shown.
 * @param props.message - What is happening, or what the user is asked.
 * @param props.isLoading - Whether something is happening, which shows the spinner.
 * @param props.actions - Buttons shown under the message, in order.
 */
export const BlockingLoaderModal = ({
  isOpen,
  message,
  isLoading,
  actions,
}: {
  isOpen: boolean;
  message: string;
  isLoading: boolean;
  actions: BlockingLoaderAction[];
}): JSX.Element => {
  const tailwind = useTailwind();
  const getColor = useGetColor();

  return (
    <CenterModal isOpen={isOpen} onClosed={() => undefined} backdropPressToClose={false} backButtonClose={false}>
      <View style={tailwind('w-full px-6 py-8 items-center')}>
        {isLoading && (
          <View style={[tailwind('mb-5'), { width: 48, height: 48 }]}>
            <LoadingSpinner size={40} />
          </View>
        )}
        <AppText style={[tailwind('text-center text-base'), { color: getColor('text-gray-80') }]} medium>
          {message}
        </AppText>
        {actions.map((action, actionIndex) => (
          <AppButton
            key={action.label}
            title={action.label}
            type={action.type}
            onPress={action.onPress}
            style={tailwind(actionIndex === 0 ? 'mt-6 w-full' : 'mt-3 w-full')}
          />
        ))}
      </View>
    </CenterModal>
  );
};
