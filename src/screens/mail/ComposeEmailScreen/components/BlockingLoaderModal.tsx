import { View } from 'react-native';
import { useTailwind } from 'tailwind-rn';

import AppButton from '../../../../components/AppButton';
import AppText from '../../../../components/AppText';
import LoadingSpinner from '../../../../components/LoadingSpinner';
import CenterModal from '../../../../components/modals/CenterModal';
import useGetColor from '../../../../hooks/useColor';

/**
 * A spinner with a message over the screen, which cannot be dismissed and lets nothing be touched
 * through it while it is open.
 *
 * @param props.isOpen - Whether the loader is shown.
 * @param props.message - What is happening while it is shown.
 * @param props.actionLabel - Text of the button shown under the message while an action is available.
 * @param props.onAction - What the button does; the button is only shown while it is set.
 */
export const BlockingLoaderModal = ({
  isOpen,
  message,
  actionLabel,
  onAction,
}: {
  isOpen: boolean;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}): JSX.Element => {
  const tailwind = useTailwind();
  const getColor = useGetColor();

  return (
    <CenterModal isOpen={isOpen} onClosed={() => undefined} backdropPressToClose={false} backButtonClose={false}>
      <View style={tailwind('w-full px-6 py-8 items-center')}>
        <View style={{ width: 48, height: 48 }}>
          <LoadingSpinner size={40} />
        </View>
        <AppText style={[tailwind('text-center text-base mt-5'), { color: getColor('text-gray-80') }]} medium>
          {message}
        </AppText>
        {!!onAction && !!actionLabel && (
          <AppButton title={actionLabel} type="secondary" onPress={onAction} style={tailwind('mt-6 w-full')} />
        )}
      </View>
    </CenterModal>
  );
};
